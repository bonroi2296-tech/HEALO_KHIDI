import { describe, it, expect } from "vitest";
import { recentSnapshotDates } from "./snapshotDates";

/**
 * KPI 스냅샷 백필 날짜 윈도우 순수 함수 테스트.
 * Vercel cron 이 하루를 걸러도(06-16·06-19 누락 실측) 다음 실행이 최근 N일을
 * 다시 메워 자동복구하는데, 그 "어느 날짜들을 메울지" 계산이 정확해야 한다.
 */
describe("recentSnapshotDates", () => {
  it("endDate 포함 최근 N일을 오래된→최신 순으로 반환한다", () => {
    expect(recentSnapshotDates("2026-06-19", 7)).toEqual([
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
    ]);
  });

  it("마지막 원소는 항상 endDate, 길이는 days", () => {
    const out = recentSnapshotDates("2026-06-19", 7);
    expect(out).toHaveLength(7);
    expect(out[out.length - 1]).toBe("2026-06-19");
  });

  it("월 경계를 넘어가도 정확히 계산한다", () => {
    expect(recentSnapshotDates("2026-07-02", 4)).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
    ]);
  });

  it("연 경계를 넘어가도 정확히 계산한다", () => {
    expect(recentSnapshotDates("2027-01-01", 3)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("days=1 이면 endDate 하나만 반환(단일일 스냅샷 호환)", () => {
    expect(recentSnapshotDates("2026-06-19", 1)).toEqual(["2026-06-19"]);
  });

  it("days<1 은 1로 클램프", () => {
    expect(recentSnapshotDates("2026-06-19", 0)).toEqual(["2026-06-19"]);
  });

  it("잘못된 endDate 형식이면 throw", () => {
    expect(() => recentSnapshotDates("2026/06/19", 7)).toThrow();
    expect(() => recentSnapshotDates("bad", 7)).toThrow();
  });
});
