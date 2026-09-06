import { describe, it, expect } from "vitest";
import { priceUnitLabel } from "./priceUnit";

describe("priceUnitLabel — 가격 단위를 화면 언어로", () => {
  it("6개 언어 전부 «session» 이 그 언어 글자로 바뀐다(영어 그대로 새던 것)", () => {
    expect(priceUnitLabel("KRW/session", "en")).toBe("KRW/session");
    expect(priceUnitLabel("KRW/session", "ko")).toBe("KRW/회");
    expect(priceUnitLabel("KRW/session", "ru")).toBe("KRW/сеанс");
    expect(priceUnitLabel("KRW/session", "kz")).toBe("KRW/рет");
    expect(priceUnitLabel("KRW/session", "zh")).toBe("KRW/次");
    expect(priceUnitLabel("KRW/session", "ja")).toBe("KRW/回");
  });
  it("tablet · day 도 같은 길", () => {
    expect(priceUnitLabel("KRW/tablet", "ja")).toBe("KRW/錠");
    expect(priceUnitLabel("KRW/day", "kz")).toBe("KRW/күн");
  });
  it("모르는 단위·빈 값은 원문 그대로 / 빈 문자열", () => {
    expect(priceUnitLabel("USD/visit", "ru")).toBe("USD/visit");
    expect(priceUnitLabel("", "ru")).toBe("");
    expect(priceUnitLabel(undefined, "ru")).toBe("");
  });
});
