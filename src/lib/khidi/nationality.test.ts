import { describe, it, expect } from "vitest";
import { normalizeNationality, NATIONALITY_NAMES } from "./nationality";

/**
 * 국적 코드 정규화 — 국가별 유치 분포(K-01 분석)에 직접 영향.
 */
describe("normalizeNationality", () => {
  it("핵심 타겟(카자흐·러시아) ISO 코드를 한국어로 바꾼다", () => {
    expect(normalizeNationality("KZ")).toBe("카자흐스탄");
    expect(normalizeNationality("RU")).toBe("러시아");
  });

  it("소문자/공백이 섞여도 정규화한다", () => {
    expect(normalizeNationality(" kz ")).toBe("카자흐스탄");
    expect(normalizeNationality("Ru")).toBe("러시아");
  });

  it("빈 값·null·undefined·공백은 '기타'", () => {
    expect(normalizeNationality(null)).toBe("기타");
    expect(normalizeNationality(undefined)).toBe("기타");
    expect(normalizeNationality("")).toBe("기타");
    expect(normalizeNationality("   ")).toBe("기타");
  });

  it("미등록 코드는 원문을 그대로 둔다(정보 손실 방지)", () => {
    expect(normalizeNationality("XX")).toBe("XX");
    expect(normalizeNationality("프랑스")).toBe("프랑스");
  });

  it("매핑 표는 알려진 CIS 국가를 포함한다", () => {
    expect(NATIONALITY_NAMES.UZ).toBe("우즈베키스탄");
    expect(NATIONALITY_NAMES.KG).toBe("키르기스스탄");
  });
});
