// 예약시각(scheduled_at 등)은 전부 KST 기준으로 저장·표시한다(비즈니스 계약).
// DB엔 UTC instant 로 저장되지만, 화면엔 뷰어의 브라우저 시간대가 아니라 항상 KST 로 보여야 한다.
// timeZone:"Asia/Seoul" 을 빼먹으면 알마티(UTC+5) 환자가 4시간 밀린 시각을 보고 상담을 놓친다
// (POSTMORTEMS — 시간대 누락 부류). scheduled_at 을 화면에 찍을 땐 반드시 이 헬퍼를 쓸 것.

const KST = "Asia/Seoul";
// locale 은 호출부의 원래 값을 그대로 넘긴다(undefined = 브라우저 기본 로케일 유지).
// 이 헬퍼가 바꾸는 건 오직 timeZone — 날짜 포맷(로케일)은 원래 동작 보존.

/** 날짜만 — KST 고정 */
export function kstDate(iso, locale, opts) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, { timeZone: KST, ...(opts || {}) });
}

/** 시각만 (기본 HH:mm) — KST 고정 */
export function kstTime(iso, locale, opts) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale, {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    ...(opts || {}),
  });
}

/** 날짜+시각 한 줄 — KST 고정 */
export function kstDateTime(iso, locale, opts) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, { timeZone: KST, ...(opts || {}) });
}

/**
 * KST 기준 달력 파트(연/월0-based/일) — 월그리드 버킷팅·"오늘" 비교용.
 * 뷰어 tz 무관하게 KST 달력일에 이벤트를 배치해야 자정 근처 날짜밀림이 안 생긴다.
 * iso 문자열 또는 Date 둘 다 받는다.
 */
export function kstDateParts(input) {
  const t = input instanceof Date ? input.getTime() : new Date(input).getTime();
  const d = new Date(t + 9 * 60 * 60 * 1000); // KST 벽시계로 이동 후 UTC 파트를 읽음
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}
