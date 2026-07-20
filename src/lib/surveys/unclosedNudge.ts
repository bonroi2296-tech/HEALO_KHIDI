/**
 * healwith: 「완료 처리 안 된 상담」 넛지 판정 (순수 함수)
 *
 * 왜 분리했나: 임계값·경과일 계산은 조용히 틀려도 아무도 모르는 종류의 로직이라
 * (알림이 안 울리는 건 화면에 안 보인다) 단위 테스트로 고정한다.
 * dispatchWindow.ts 와 같은 관행.
 *
 * 배경: `completed` 는 사람이 직접 눌러야 바뀐다(LiveKit webhook 이 의도적으로 status 를
 * 안 건드림 = 실적 정직성 설계). 안 누르면 K-02·K-03 이 조용히 0 이 된다.
 */

/** 예정시각이 이만큼 지나도 'scheduled' 면 "끝났는데 안 누른 것"으로 본다. */
export const UNCLOSED_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface PendingSession {
  /** consultation_sessions.scheduled_at (ISO) */
  scheduled_at: string | null;
}

export interface UnclosedNudge {
  count: number;
  /** 가장 오래 방치된 건의 경과 일수 (최소 1) */
  oldestDays: number;
}

/**
 * 넛지를 울릴지, 울린다면 무슨 숫자로 울릴지 판정한다.
 * 대상이 없으면 null (호출부는 알림을 보내지 않는다).
 *
 * @param rows  status='scheduled' 인 실(비테스트) 세션들. 정렬은 신경 쓰지 않는다.
 * @param now   기준 시각 (ms)
 */
export function computeUnclosedNudge(
  rows: PendingSession[],
  now: number
): UnclosedNudge | null {
  // scheduled_at 이 없으면 언제 끝났어야 하는지 알 수 없다 → 판단 보류(넛지 대상 제외).
  // 넣어버리면 "예정도 안 잡힌 세션"까지 매일 울려 알림이 무의미해진다.
  const stale = rows.filter((r) => {
    if (!r.scheduled_at) return false;
    const t = new Date(r.scheduled_at).getTime();
    if (Number.isNaN(t)) return false; // 깨진 값은 조용히 무시(알림을 죽이지 않음)
    return now - t >= UNCLOSED_THRESHOLD_MS;
  });

  if (stale.length === 0) return null;

  const oldestMs = Math.max(
    ...stale.map((r) => now - new Date(r.scheduled_at as string).getTime())
  );

  return {
    count: stale.length,
    // 24h 를 갓 넘긴 건이 "0일 방치"로 표시되면 말이 안 되므로 하한 1.
    oldestDays: Math.max(1, Math.floor(oldestMs / (24 * 60 * 60 * 1000))),
  };
}
