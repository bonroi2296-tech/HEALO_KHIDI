/**
 * 환자가 올린 서류의 «종류» 목록 — 단일 SoR.
 *
 * 이걸로 세 가지를 한다:
 *   ① AI 에게 「이 중 하나로 골라라」고 준다 (server: /api/inquiry/classify-doc)
 *   ② 화면에서 「확인된 것 / 아직 없는 것」을 보여준다
 *   ③ AI 판독이 틀렸을 때 사용자가 «직접 고르는» 목록이 된다
 *
 * ⚠️ AI 판독은 «사실»이 아니라 «추정»이다. 의료 서류라 화면에도 그렇게 적고,
 *    사용자가 언제든 고칠 수 있어야 한다(PO 결정 2026-08-12).
 *
 * needed: true = 대학병원이 요구하는 것. 없으면 「아직 없는 것」에 뜬다.
 *         false = 있으면 좋지만 없다고 안내하지는 않는 것.
 */

import { t } from "@/lib/i18n";

// 문구는 사전(dictionary.js)에 있다 — 코디 편집기로 고칠 수 있게. 여기는 키만 든다.
const K = (key) => ({ key });

export const DOC_KINDS = [
  { value: "discharge", needed: true, label:
    K("referral.doc.discharge") },
  { value: "pathology", needed: true, label:
    K("referral.doc.pathology") },
  { value: "imaging_report", needed: true, label:
    K("referral.doc.imaging_report") },
  { value: "blood", needed: true, label:
    K("referral.doc.blood") },
  { value: "endoscopy", needed: false, label:
    K("referral.doc.endoscopy") },
  { value: "surgery_record", needed: false, label:
    K("referral.doc.surgery_record") },
  { value: "chemo_record", needed: false, label:
    K("referral.doc.chemo_record") },
  { value: "radio_record", needed: false, label:
    K("referral.doc.radio_record") },
  { value: "prescription", needed: false, label:
    K("referral.doc.prescription") },
  { value: "passport", needed: false, label:
    K("referral.doc.passport") },
  { value: "imaging_file", needed: false, label:
    K("referral.doc.imaging_file") },
  // 음성 메모 — 환자·에이전시가 왓츠앱·텔레그램으로 «말로» 병력을 보내는 경로가 실제로 있다.
  // 서류가 아니라 소리라 needed 에는 안 넣는다(없다고 재촉할 것이 아니다).
  { value: "voice_memo", needed: false, label:
    K("referral.doc.voice_memo") },
  { value: "other", needed: false, label:
    K("referral.doc.other") },
  // 「판별 못 함」은 «누가» 못 했단 건지·«내가 뭐해야 하는지»를 안 알려준다(2026-08-14 PO:
  // 「사용자가 판별을 못했다는거야 아님 뭐 어쩌라는건데?」).
  // 고르는 칸의 한 줄은 «사람이 고를 수 있는 답» 이어야 한다 — 상태 보고가 아니라.
  { value: "unknown", needed: false, label:
    K("referral.doc.unknown") },
];

/** 대학병원이 요구하는 종류만. 「아직 없는 것」 목록의 기준. */
export const NEEDED_KINDS = DOC_KINDS.filter((k) => k.needed).map((k) => k.value);

export const isKnownKind = (v) => DOC_KINDS.some((k) => k.value === v);

export function kindLabel(value, lang) {
  const k = DOC_KINDS.find((x) => x.value === value);
  if (!k) return value || "";
  return t(k.label.key, lang);
}

/**
 * 올린 서류들로 「무엇이 아직 없나」를 낸다.
 * @param docs [{kind}] — AI 추정이든 사용자가 고친 값이든 같은 모양
 */
export function missingKinds(docs = []) {
  const have = new Set(docs.map((d) => d?.kind).filter(Boolean));
  return NEEDED_KINDS.filter((k) => !have.has(k));
}

/**
 * 같은 칸을 두 서류가 «서로 다르게» 말할 때 어느 쪽을 믿나.
 *
 * 왜 (2026-09-08 #316 실사고): 자동채움은 「나중에 끝난 서류가 이긴다」였다. 조직검사
 * 사진(180KB)이 먼저 끝나 진단코드에 C61(전립선 선암, Gleason 7)을 넣었는데, 뒤늦게 끝난
 * MRI 판독지 PDF(4.1MB)가 그 위에 Z04(= 검사를 받은 사유)를 덮어썼다. 서류가 도착한
 * «순서»는 파일 크기가 정하는데, 진단의 무게는 서류의 «종류»가 정한다.
 *
 * 순위는 임상 관행을 그대로 옮긴 것이다:
 *   · 암 진단을 «확정»하는 것은 조직검사다. 영상은 의심 소견까지만 말한다.
 *   · 퇴원요약·종합소견서는 의사가 정리한 최종 진단이라 영상보다 무겁다.
 *   · 신원(이름·생년월일·여권번호)의 정본은 여권이다. 병원 기록의 표기는 자주 다르다.
 *
 * 🛑 순위에 없는 종류끼리, 또는 순위가 같으면 예전대로 «나중 것이 이긴다» —
 *    새 서류를 올렸는데 아무것도 안 바뀌는 것이 더 나쁘다.
 */
const DIAGNOSIS_RANK = { pathology: 4, discharge: 3, surgery_record: 2, imaging_report: 1 };
const IDENTITY_RANK = { passport: 3, discharge: 1 };
const DIAGNOSIS_FIELDS = new Set(["diagnosisNameRaw", "icdCode", "stage", "diagnosisDate"]);
const IDENTITY_FIELDS = new Set(["lastName", "firstName", "birthDate", "passportNo", "nationality"]);

/**
 * 새로 읽은 값이 이미 채워진 값을 «덮어써도 되나».
 * @param field 칸 이름 · @param incomingKind 새 서류 종류 · @param currentKind 지금 값을 넣은 서류 종류
 * @returns true = 덮어쓴다
 */
export function docValueBeats(field, incomingKind, currentKind) {
  const rank = DIAGNOSIS_FIELDS.has(field) ? DIAGNOSIS_RANK
    : IDENTITY_FIELDS.has(field) ? IDENTITY_RANK
    : null;
  if (!rank) return true;                       // 순위를 안 두는 칸 — 나중 것이 이긴다
  const a = rank[incomingKind] || 0;
  const b = rank[currentKind] || 0;
  return a >= b;                                 // 같으면 나중 것이 이긴다
}

/**
 * 판독기가 서류·음성에서 뽑아낸 값의 «사람이 읽는 이름».
 *
 * 왜 여기 두나 (2026-09-04): 같은 표를 코디 문의 상세와 음성 보관함 두 곳이 그린다.
 * 각자 베껴 두면 칸을 하나 늘릴 때 한쪽만 고쳐져 「어떤 화면에선 안 보이는 값」이 생긴다.
 * 판독 창구(app/api/inquiry/classify-doc)의 FILLABLE 과 짝이다 — 거기 칸을 늘리면 여기도 늘려라.
 */
export const DOC_FIELD_LABELS = {
  lastName: "성", firstName: "이름", birthDate: "생년월일", sex: "성별",
  email: "이메일", phone: "전화", nationality: "국적",
  diagnosisNameRaw: "진단명", icdCode: "진단코드", diagnosisDate: "진단시기", stage: "병기",
  chiefComplaint: "주호소", testsAndTreatments: "검사·치료", medications: "복용약",
  pastHistoryNote: "과거력", familyHistory: "가족력", localDoctorOpinion: "현지 주치의 소견",
};
