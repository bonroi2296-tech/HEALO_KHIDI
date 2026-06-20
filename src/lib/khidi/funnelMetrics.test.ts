import { describe, it, expect } from "vitest";
import { pct, maskName } from "./funnelMetrics";

/**
 * 전환 깔때기 순수 헬퍼 — 전환율(평가 숫자)·PII 마스킹(개인정보) 직결.
 */
describe("pct", () => {
  it("전환율을 소수점 첫째 자리까지 반올림한다", () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(2, 3)).toBe(66.7);
    expect(pct(50, 100)).toBe(50);
    expect(pct(100, 100)).toBe(100);
  });

  it("분모가 0이면 0 (NaN/Infinity 방어)", () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 0)).toBe(0);
  });

  it("분자가 0이면 0", () => {
    expect(pct(0, 12)).toBe(0);
  });
});

describe("maskName", () => {
  it("첫 글자만 남기고 마스킹한다", () => {
    expect(maskName("Aigerim", "Nur")).toBe("A***");
    expect(maskName("김", "환자")).toBe("김***");
  });

  it("성/이름 어느 쪽만 있어도 첫 글자를 쓴다", () => {
    expect(maskName(null, "Nur")).toBe("N***");
    expect(maskName("Aigerim", null)).toBe("A***");
  });

  it("이름이 비면 '(이름 없음)'", () => {
    expect(maskName(null, null)).toBe("(이름 없음)");
    expect(maskName("", "")).toBe("(이름 없음)");
    expect(maskName("   ", "  ")).toBe("(이름 없음)");
  });

  it("이모지/특수문자도 첫 코드포인트만 노출", () => {
    expect(maskName("José", "")).toBe("J***");
  });
});
