import { describe, it, expect } from "vitest";
import { matchHospitals, type HospitalCapability, type MatchingCriteria } from "./matchingEngine";

function cap(over: Partial<HospitalCapability>): HospitalCapability {
  return {
    id: "c1",
    hospital_id: "h1",
    hospital_name: "Test Hospital",
    hospital_slug: "test",
    cancer_type: "stomach",
    treatment_types: ["surgery"],
    annual_cases: 100,
    success_rate: 0.8,
    avg_treatment_cost_usd: 20000,
    avg_duration_days: 14,
    specialized_doctors: [],
    certifications: [],
    is_verified: true,
    ...over,
  };
}

const criteria: MatchingCriteria = {
  cancerType: "stomach",
  preferredTreatments: ["surgery"],
  budgetMin: 10000,
  budgetMax: 30000,
  budgetCurrency: "USD",
};

describe("matchHospitals", () => {
  it("암종이 다르면 제외(필터)", () => {
    const res = matchHospitals(
      [cap({ hospital_id: "a", cancer_type: "stomach" }), cap({ hospital_id: "b", cancer_type: "lung" })],
      criteria
    );
    expect(res.map((r) => r.hospitalId)).toEqual(["a"]);
  });

  it("총점 내림차순 정렬 + limit 적용", () => {
    const strong = cap({ hospital_id: "strong", annual_cases: 500, success_rate: 0.95 });
    const weak = cap({ hospital_id: "weak", annual_cases: 5, success_rate: 0.4 });
    const res = matchHospitals([weak, strong], criteria, 1);
    expect(res).toHaveLength(1);
    expect(res[0].hospitalId).toBe("strong");
    expect(res[0].totalScore).toBeGreaterThan(0);
  });

  it("총점 = 4개 세부점수 합, matchReasons·breakdown 존재", () => {
    const [m] = matchHospitals([cap({})], criteria);
    const b = m.breakdown;
    expect(m.totalScore).toBe(b.annualCasesScore + b.successRateScore + b.budgetFitScore + b.treatmentMatchScore);
    expect(Array.isArray(m.matchReasons)).toBe(true);
    expect(m.capability.hospital_id).toBe("h1");
  });

  it("빈 입력 → 빈 배열, 결정적", () => {
    expect(matchHospitals([], criteria)).toEqual([]);
    const list = [cap({ hospital_id: "a" }), cap({ hospital_id: "b", annual_cases: 300 })];
    expect(matchHospitals(list, criteria)).toEqual(matchHospitals(list, criteria));
  });
});
