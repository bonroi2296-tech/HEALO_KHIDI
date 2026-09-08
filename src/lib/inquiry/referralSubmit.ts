/**
 * 의뢰서 접수(app/api/inquiries/referral) — «조용히 틀리는» 변환 세 개.
 * 라우트 안에 두면 검사가 못 부른다 → 여기로 빼서 검사와 짝을 이룬다(referralSubmit.test.ts).
 */

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
