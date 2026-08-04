/**
 * 배포 창구 「하루 휴무」 — 특정 날짜 하루만 정시 창구를 건너뛴다.
 *
 * 왜 (2026-08-04 PO 지시): *"오늘은 1시에 배포할거니깐 3시 배포는 오늘 하루만 중단해주고
 * 내일 다시 가동하자. 오늘 1시 이후에 필요하면 내가 배포해달라고 지시해줄게"*
 *
 * ⚠️ 이 장치의 제일 위험한 실패는 «영영 멈추는 것»이다(배포가 조용히 안 나가고 아무도 모른다).
 *    그래서 ①날짜를 «명시»해서만 쉬고 ②목록이 비면 무조건 정상 가동 ③단위 시험으로 잠근다.
 *    지나간 날짜는 저절로 무효가 되므로 다음 날 자동으로 되살아난다 — 사람이 뭘 켤 필요가 없다.
 *
 * 지난 날짜는 지워도 되고 남겨둬도 동작에 영향이 없다(기록으로 남기는 편이 낫다).
 */

/** 쉬는 날(한국시간 기준 YYYY-MM-DD). 이유를 옆에 꼭 적어라 — 안 적으면 다음 사람이 못 지운다. */
export const DEPLOY_WINDOW_HOLIDAYS: ReadonlyArray<{ date: string; why: string }> = [
  {
    date: "2026-08-04",
    why: "PO 가 오후 1시에 직접 내보내기로 함 — 그 뒤 것은 PO 지시가 있을 때만 (2026-08-04 지시)",
  },
];

/** 그 시각의 «한국시간 날짜»(YYYY-MM-DD). 서버가 어느 시간대든 같은 답이 나오게 UTC+9 로 직접 민다. */
export function kstDateString(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 오늘이 쉬는 날이면 그 이유를, 아니면 null.
 * (호출부는 null 이 아닐 때만 건너뛰고, 그 이유를 로그·응답에 남긴다)
 */
export function windowHolidayReason(now: Date = new Date()): string | null {
  const today = kstDateString(now);
  const hit = DEPLOY_WINDOW_HOLIDAYS.find((h) => h.date === today);
  return hit ? hit.why : null;
}
