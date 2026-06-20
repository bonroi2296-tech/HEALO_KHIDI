import { describe, it, expect } from "vitest";
import { likertTo100, avgSatisfaction100 } from "./satisfaction";

/**
 * K-03 만족도 환산식(평가 점수 직결) 단위테스트.
 * 이 ×20 환산이 kpi.ts·satisfaction/route.ts 양쪽 대시보드 숫자를 결정한다.
 */
describe("likertTo100", () => {
  it("Likert 평균을 ×20 한 100점으로 환산한다", () => {
    expect(likertTo100(5)).toBe(100);
    expect(likertTo100(4.5)).toBe(90); // K-03 목표선
    expect(likertTo100(3)).toBe(60);
    expect(likertTo100(0)).toBe(0);
  });

  it("소수점 둘째 자리에서 반올림해 첫째 자리까지 남긴다", () => {
    // 4.567 × 20 = 91.34 → 91.3
    expect(likertTo100(4.567)).toBe(91.3);
    // 3.333... × 20 = 66.66.. → 66.7
    expect(likertTo100(10 / 3)).toBe(66.7);
  });
});

describe("avgSatisfaction100", () => {
  it("응답이 없으면 null (kpi.ts 누적 집계용 — 0과 구분)", () => {
    expect(avgSatisfaction100([])).toBeNull();
    expect(avgSatisfaction100(null)).toBeNull();
    expect(avgSatisfaction100(undefined)).toBeNull();
  });

  it("만점 응답이면 100점", () => {
    expect(
      avgSatisfaction100([
        { q1_score: 5, q2_score: 5, q3_score: 5, q4_score: 5, q5_score: 5 },
      ])
    ).toBe(100);
  });

  it("최저점 응답이면 20점 (1×20)", () => {
    expect(
      avgSatisfaction100([
        { q1_score: 1, q2_score: 1, q3_score: 1, q4_score: 1, q5_score: 1 },
      ])
    ).toBe(20);
  });

  it("여러 응답의 평균을 낸다", () => {
    // 응답A 평균5점→100, 응답B 평균3점→60 ⇒ (100+60)/2 = 80
    expect(
      avgSatisfaction100([
        { q1_score: 5, q2_score: 5, q3_score: 5, q4_score: 5, q5_score: 5 },
        { q1_score: 3, q2_score: 3, q3_score: 3, q4_score: 3, q5_score: 3 },
      ])
    ).toBe(80);
  });

  it("null/미응답 점수는 0점으로 합산한다 (기존 동작 보존)", () => {
    // (4+4+4+4+0)/5 = 3.2 → ×20 = 64
    expect(
      avgSatisfaction100([
        { q1_score: 4, q2_score: 4, q3_score: 4, q4_score: 4, q5_score: null },
      ])
    ).toBe(64);
  });

  it("kpi.ts 와 satisfaction/route.ts 가 같은 값을 내야 한다 (단일 소스 회귀방지)", () => {
    const responses = [
      { q1_score: 5, q2_score: 4, q3_score: 5, q4_score: 4, q5_score: 5 },
      { q1_score: 4, q2_score: 4, q3_score: 4, q4_score: 3, q5_score: 4 },
    ];
    // satisfaction/route.ts 방식: 문항별 평균 → 5문항 평균 → ×20
    const qAvg = (k: keyof (typeof responses)[number]) =>
      responses.reduce((s, r) => s + (r[k] || 0), 0) / responses.length;
    const routeStyle =
      Math.round(
        ((qAvg("q1_score") +
          qAvg("q2_score") +
          qAvg("q3_score") +
          qAvg("q4_score") +
          qAvg("q5_score")) /
          5) *
          20 *
          10
      ) / 10;
    expect(avgSatisfaction100(responses)).toBe(routeStyle);
  });
});
