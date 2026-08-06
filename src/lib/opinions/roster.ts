/**
 * 세컨드 오피니언 명단 — 링크를 연 의사가 "본인"을 고르는 드롭다운의 원천.
 *
 * 면력한방병원 원장 4분 + 협진 대학병원 2곳 + "그 외 의료진"(명단 밖 — 의사는 부담 0,
 * 코디가 나중에 라벨). MVP 는 상수(계정/로그인 불필요). 병원별 로스터가 필요해지면 테이블로 승격.
 * 링크 하나에 여러 원장이 각자 본인을 골라 소견을 남겨도 각각 귀속된다(이견도 나란히 보관).
 *
 * 대학병원은 «사람»이 아니라 병원 이름으로 둔다(2026-08-04 PO 요청) — 그쪽은 어느 선생님이
 * 열어볼지 우리가 미리 알 수 없다. 이름이 필요하면 소견 본문에 적어 주시면 코디가 붙인다.
 */

export const OPINION_OTHER_KEY = "other";
export const OPINION_OTHER_LABEL = "그 외 의료진";

export const OPINION_ROSTER: { key: string; name: string }[] = [
  { key: "hwang_ijun", name: "황이준 원장" },
  { key: "yoo_hyeongjin", name: "유형진 원장" },
  { key: "bae_giljun", name: "배길준 원장" },
  { key: "kang_juan", name: "강주안 원장" },
  { key: "ewha_seoul", name: "이대서울병원" },
  { key: "ewha_mokdong", name: "이대목동병원" },
  // 2026-08-06: 협진 대학병원 4곳(app/partners/copy.js 표기)과 명단을 맞춘다. 세브란스에
  // 첫 소견 요청을 보내는데 명단에 없어 "그 외 의료진"을 고르게 되던 것을 막는다.
  { key: "severance_sinchon", name: "신촌세브란스병원" },
  { key: "korea_guro", name: "고려대구로병원" },
];

/** roster key → 표시 이름. 'other'(그 외 의료진)면 OPINION_OTHER_LABEL, 미상 key 면 null. */
export function rosterName(key: string | null | undefined): string | null {
  if (key === OPINION_OTHER_KEY) return OPINION_OTHER_LABEL;
  const hit = OPINION_ROSTER.find((r) => r.key === key);
  return hit ? hit.name : null;
}

/** 제출 시 doctor_key 검증 — 명단에 있는 것 또는 'other' 만 허용(임의 값 차단). */
export function isValidOpinionDoctorKey(key: unknown): key is string {
  return key === OPINION_OTHER_KEY || OPINION_ROSTER.some((r) => r.key === key);
}
