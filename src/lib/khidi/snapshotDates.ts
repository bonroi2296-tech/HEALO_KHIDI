/**
 * KPI 스냅샷 백필 날짜 윈도우 계산 (순수 함수).
 *
 * kpi.ts 와 분리한 이유: kpi.ts 는 `import "server-only"` 라 테스트(vitest)에서
 * 직접 임포트하면 throw 한다. 날짜 계산만 떼어 순수 모듈로 두면 단위테스트가 쉽다.
 */

/**
 * endDate(YYYY-MM-DD) 포함 최근 `days`일치 날짜 목록(오래된→최신).
 * 마지막 원소 = endDate, 길이 = max(1, days).
 */
export function recentSnapshotDates(endDate: string, days: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error(`recentSnapshotDates: invalid endDate ${endDate}`);
  }
  const n = Math.max(1, Math.floor(days));
  const [y, m, d] = endDate.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(base - i * 24 * 60 * 60 * 1000);
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
    );
  }
  return out;
}
