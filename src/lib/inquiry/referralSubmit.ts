/**
 * 의뢰서 접수(app/api/inquiries/referral) — 입력 스키마와 «조용히 틀리는» 변환들.
 * 라우트 안에 두면 검사가 못 부른다 → 여기로 빼서 검사와 짝을 이룬다(referralSubmit.test.ts).
 *
 * 🛑 스키마를 라우트로 되돌리지 마라 (2026-09-08 실측): App Router 라우트 파일은 정해진 이름
 *    (POST·GET·runtime …)만 내보낼 수 있다. 시험이 부르라고 `export const Schema` 를 붙였더니
 *    `npx tsc --noEmit` 은 통과하는데 **빌드가 깨졌다**(.next/types 검사는 빌드 때만 돈다).
 *    그리고 이 스키마야말로 «실제로 파싱을 통과하는지»를 재야 하는 물건이다 — zod 는 모르는
 *    키를 조용히 버리고, 이 저장소는 그걸로 두 번 당했다(cdFolder.path · stage).
 */
import { z } from "zod";

/**
 * 사람이 넣은 «대용량 저장소 주소». 코디 화면에서 <a href> 로 열리므로 http(s) 만 통과 —
 * javascript: 같은 건 코디 브라우저에서 «실행»된다.
 * 🛑 접수 자체를 막지는 않는다(환자가 문의를 못 넣는 것보다 링크 하나 버리는 게 낫다) — 안 맞으면 null.
 */
export const safeLink = (v: unknown): string | null =>
  typeof v === "string" && /^https?:\/\/[^\s<>"']{4,}$/i.test(v.trim()) ? v.trim() : null;

/**
 * 의뢰서 화면은 짧은 이름(pipa·sensitive…)을 쓰지만, 코디 화면·KHIDI 감사·옛 폼은 전부
 * intake.consents 를 «공용 이름»(pipa_collection·sensitive_health…)으로 읽는다(intakeLabels CONSENT_ITEMS).
 * 🛑 2026-08-19 실측: 변환 없이 넣었더니 환자가 「모두 동의」했는데 코디 화면엔 필수 4개가 «미동의»로
 *    떴다 — 법적 기록이 화면에서 거짓이 된다. intake.consents 는 반드시 공용 이름으로.
 */
export const CONSENT_KEY_MAP: Record<string, string> = {
  pipa: "pipa_collection",
  sensitive: "sensitive_health",
  thirdParty: "third_party_hospital",
  crossBorder: "cross_border_kr",
  marketing: "marketing",
};
export const toCanonicalConsents = (c: Record<string, boolean>): Record<string, boolean> =>
  Object.fromEntries(Object.entries(c || {}).map(([k, v]) => [CONSENT_KEY_MAP[k] ?? k, v]));

/**
 * 「이 칸은 기계가 서류에서 읽어 채운 값」 표시를 저장할 모양으로 고른다.
 * 화면 표시 → { 칸이름: 서류 파일명 } (파일명을 못 받았으면 "서류").
 *
 * 🛑 «실제로 값이 함께 들어온 칸»만 남긴다. 환자가 전체 모드에서 서류를 읽혔다가 「상담만」으로
 *    되돌아가 보내면 값은 빠지고 표시만 남는다 — 그러면 코디 화면에 «비어 있는데 서류에서
 *    읽었다고 적힌» 칸이 생긴다.
 *
 * 왜 필요한가 (2026-09-08 #316): 이 표시가 접수 창구에서 통째로 버려지고 있었다. 검사결과지
 * 머리에 찍힌 코드를 판독기가 진단코드 칸에 넣었는데, 저장된 뒤에는 그게 환자가 손으로 적은
 * 값과 구분이 안 됐다. 코디 화면(referral-fill)은 같은 것을 `_filledFromDocs` 에 남기고 있었다.
 */
export const pickFilledFromDocs = (
  marks: Record<string, string | boolean> | null | undefined,
  values: Record<string, unknown>,
): Record<string, string> | null => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(marks || {})) {
    if (!v) continue;
    const val = values?.[k];
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    out[k] = typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : "서류";
  }
  return Object.keys(out).length ? out : null;
};

/**
 * 의뢰서의 진단 시기는 «연-월»(2026-05)이다. cancer_patient_intakes.diagnosis_date 는 date 형이라
 * 그대로 넣으면 거부된다 — 🛑 2026-08-19 실측: 그 한 번의 실패에 «병기까지» 같이 저장이 안 됐다
 * (같은 upsert 라서). 월만 있으면 1일로 채운다. 아무 형식도 아니면 null.
 */
export const toDateOrNull = (v?: string | null): string | null => {
  if (!v) return null;
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  return null;
};

const s = (max: number) => z.string().max(max).nullable().optional();
export const Schema = z.object({
  // 접수 문턱 — 화면과 «같은 5칸». 여기를 늘리려면 referralSchema.js 부터 고쳐라.
  lastName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  patientLang: z.enum(["ko", "en", "ru", "kz", "kk", "zh", "ja"]),   // step1 과 같은 폭 — 낯선 코드는 코디 화면·메일 언어를 깨뜨린다
  cancerType: z.string().min(1).max(40),

  mode: z.enum(["quick", "full"]).optional(),
  phone: s(40),
  birthDate: s(20), sex: s(10), nationality: s(10), passportNo: s(60),
  stage: s(10), diagnosisNameRaw: s(600), icdCode: s(30),
  diagnosisDate: s(20), onsetDate: s(100),
  chiefComplaint: s(3000), testsAndTreatments: s(3000), localDoctorOpinion: s(3000),
  pastHistory: z.array(z.string().max(40)).max(20).optional(),
  pastHistoryNote: s(2000), medications: s(2000), familyHistory: s(2000),
  // 환자가 무엇을 받고 싶은가 — 병원에 보낼 의뢰서의 «질문»이 된다.
  // 개인정보가 아니라 고른 목록이므로 암호화 안 한다(코디가 목록에서 바로 보여야 한다).
  referralWants: z.array(z.string().max(20)).max(10).optional(),
  referralPurpose: s(2000), preferredDate: s(20),
  dateFlexible: z.boolean().optional(), flightFitness: s(20),

  // 봉투에 올린 서류 — 종류는 «추정»이거나 사용자가 고친 값이다. 사실로 다루지 마라.
  // link: 파일이 200MB 를 넘어 «못 올린» 경우, 사람이 그 자리에서 남긴 대용량 저장소 주소.
  // 안 받으면 화면에만 있고 조용히 버려진다(2026-08-18 실측으로 잡음).
  // ⚠️ 개수 상한은 «실제 환자 의무기록 한 벌»을 기준으로 잡아라. 30 이던 동안, 서류를 31장 넘게
  //    올린 사람은 다 올려놓고 마지막 「보내기」에서 400 을 맞았다(2026-09-08 실서비스 4회 연속).
  //    화면 문구가 그 400 을 「이메일 주소를 확인해 주세요」로 옮겨서 PO 는 이메일을 계속 고쳤다.
  //    실측: 성공한 문의 #321 은 첨부 13개였고, 그 뒤 62개까지 올리자 매번 실패했다.
  //    유방암 케이스 한 벌이 PDF 44장이다. 100 이면 그 두 배를 받는다.
  envelope: z.array(z.object({
    path: s(500), name: s(300), size: z.number().optional(),
    kind: s(40), confidence: z.number().nullable().optional(),
    corrected: z.boolean().optional(),
    link: s(600),
  })).max(100).optional(),
  // 🛑 zod 는 스키마에 없는 키를 «조용히» 버린다. 화면은 path(저장소 경로)를 보내는데 여기 없어서
  //    CD 묶음(수백 MB, 40초 묶고 몇 분 올린 것)이 저장소에만 남고 DB 어디에도 연결이 안 됐다
  //    (2026-08-19 독립 리뷰 2명이 동시에 짚음). 코디는 「CD 601개 · 100MB」만 보고 열 수가 없었다.
  cdFolder: z.object({
    name: s(300), size: z.number().optional(), count: z.number().optional(), rawSize: z.number().optional(),
    path: s(400), link: s(600),
  }).nullable().optional(),
  // 어느 칸을 «기계가 서류에서 읽어» 채웠나 — { 칸이름: 서류 파일명 | true }.
  // 코디 화면(referral-fill)이 쓰는 intake_data._filledFromDocs 와 같은 자리에 넣는다.
  autoFilled: z.record(z.string().max(60), z.union([z.string().max(300), z.boolean()])).optional(),

  consents: z.record(z.string(), z.boolean()).optional(),
  sourceLocale: s(10), referrerHost: s(200), landingPath: s(300),
  utm: z.record(z.string(), z.string().max(200)).nullable().optional(),
});
