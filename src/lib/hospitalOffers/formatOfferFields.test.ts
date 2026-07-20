import { describe, it, expect } from "vitest";
import { formatRecoveryTime, formatDuration } from "./formatOfferFields";

describe("formatRecoveryTime", () => {
  it("값이 없으면 null (빈 문자열로 컬럼을 더럽히지 않는다)", () => {
    expect(formatRecoveryTime(null, null)).toBeNull();
    expect(formatRecoveryTime(undefined, undefined)).toBeNull();
  });

  it("한쪽만 있으면 그 값만", () => {
    expect(formatRecoveryTime(3, null)).toBe("3일");
    expect(formatRecoveryTime(null, 7)).toBe("7일");
  });

  it("범위는 물결로", () => {
    expect(formatRecoveryTime(3, 7)).toBe("3~7일");
  });

  it("min==max 면 한 번만 (미리보기와 적용 결과가 갈리던 지점)", () => {
    expect(formatRecoveryTime(3, 3)).toBe("3일");
  });

  it("0 은 값이 없는 것과 다르다", () => {
    expect(formatRecoveryTime(0, 0)).toBe("0일");
  });
});

describe("formatDuration", () => {
  it("분 단위를 붙인다 (예전엔 단위 없이 '30' 만 환자에게 보였다)", () => {
    expect(formatDuration(30)).toBe("30분");
  });

  it("값이 없거나 숫자가 아니면 null", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
  });
});
