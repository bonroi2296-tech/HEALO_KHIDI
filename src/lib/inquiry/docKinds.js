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
