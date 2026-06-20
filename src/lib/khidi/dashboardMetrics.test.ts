import { describe, it, expect } from "vitest";
import {
  achievementPct,
  barPct,
  projectProgressPct,
  consultCareTotal,
  sharePct,
} from "./dashboardMetrics";

/**
 * 대시보드 달성률·진척률 — 평가위원이 보는 숫자. 회귀방지.
 */
describe("achievementPct", () => {
  it("실적/목표 달성률을 반올림한다", () => {
    expect(achievementPct(4, 12)).toBe(33); // 유치 4/12
    expect(achievementPct(12, 120)).toBe(10); // 상담+사후 12/120
    expect(achievementPct(90, 90)).toBe(100);
  });

  it("목표 초과는 100으로 클램프한다", () => {
    expect(achievementPct(15, 12)).toBe(100);
  });

  it("목표가 없으면 null (목표 바 없는 카드)", () => {
    expect(achievementPct(5, null)).toBeNull();
    expect(achievementPct(5, 0)).toBeNull();
  });

  it("실적 null/0 은 0%", () => {
    expect(achievementPct(null, 12)).toBe(0);
    expect(achievementPct(0, 12)).toBe(0);
  });
});

describe("barPct", () => {
  it("채움 비율을 0~100으로 클램프한다", () => {
    expect(barPct(3, 6)).toBe(50);
    expect(barPct(10, 6)).toBe(100);
    expect(barPct(0, 6)).toBe(0);
  });

  it("max 0/null 이면 0", () => {
    expect(barPct(5, 0)).toBe(0);
    expect(barPct(5, null)).toBe(0);
  });
});

describe("projectProgressPct", () => {
  const start = new Date("2026-04-01");
  const end = new Date("2026-11-30");

  it("시작 전이면 0, 끝 이후면 100", () => {
    expect(projectProgressPct(new Date("2026-03-01"), start, end)).toBe(0);
    expect(projectProgressPct(new Date("2026-12-31"), start, end)).toBe(100);
  });

  it("중간 시점은 0~100 사이 비율", () => {
    const mid = projectProgressPct(new Date("2026-08-01"), start, end);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });

  it("start==end(0 기간)면 0 (NaN 방어)", () => {
    expect(projectProgressPct(new Date("2026-08-01"), start, start)).toBe(0);
  });
});

describe("consultCareTotal", () => {
  it("사전상담 + 사후관리 합산", () => {
    expect(consultCareTotal(7, 5)).toBe(12);
  });
  it("null 은 0 취급", () => {
    expect(consultCareTotal(null, 5)).toBe(5);
    expect(consultCareTotal(null, null)).toBe(0);
  });
});

describe("sharePct", () => {
  it("분포 비율을 반올림한다", () => {
    expect(sharePct(1, 4)).toBe(25);
    expect(sharePct(1, 3)).toBe(33);
  });
  it("total 0 이면 0", () => {
    expect(sharePct(2, 0)).toBe(0);
  });
});
