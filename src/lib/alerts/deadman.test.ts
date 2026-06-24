import { describe, it, expect } from "vitest";
import { evaluateDeadman, daysBetween } from "./deadman";

describe("daysBetween", () => {
  it("같은 날 = 0", () => expect(daysBetween("2026-06-24", "2026-06-24")).toBe(0));
  it("이틀 차 = 2", () => expect(daysBetween("2026-06-22", "2026-06-24")).toBe(2));
  it("월 경계 넘김", () => expect(daysBetween("2026-05-31", "2026-06-02")).toBe(2));
  it("파싱 불가 = NaN", () => expect(Number.isNaN(daysBetween("bad", "2026-06-24"))).toBe(true));
});

const OK = { todayKst: "2026-06-24", latestSnapshotDate: "2026-06-24", completedSessions: 5, surveysSent: 2 };

describe("evaluateDeadman — KPI 스냅샷", () => {
  it("최신이면 알림 없음", () => {
    expect(evaluateDeadman(OK)).toHaveLength(0);
  });
  it("스냅샷 없음 = critical", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: null });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "critical" });
  });
  it("2일 밀림 = warning", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-22" });
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "warning" });
    expect(a[0].details.lagDays).toBe(2);
  });
  it("1일 밀림 = 알림 없음(정상 지연)", () => {
    expect(evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-23" })).toHaveLength(0);
  });
  it("4일 이상 밀림 = critical", () => {
    const a = evaluateDeadman({ ...OK, latestSnapshotDate: "2026-06-20" });
    expect(a[0]).toMatchObject({ key: "kpi_snapshot_stale", severity: "critical" });
  });
});

describe("evaluateDeadman — 설문 발송 0", () => {
  it("완료 상담 있고 설문 0 = warning", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 4, surveysSent: 0 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(true);
  });
  it("설문 발송 있으면 알림 없음", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 4, surveysSent: 1 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(false);
  });
  it("완료 상담 적으면(<3) 알림 없음 — 데이터 부족이지 고장 아님", () => {
    const a = evaluateDeadman({ ...OK, completedSessions: 2, surveysSent: 0 });
    expect(a.some((x) => x.key === "survey_dispatch_zero")).toBe(false);
  });
  it("두 조건 동시 발화", () => {
    const a = evaluateDeadman({ todayKst: "2026-06-24", latestSnapshotDate: null, completedSessions: 9, surveysSent: 0 });
    expect(a).toHaveLength(2);
  });
});
