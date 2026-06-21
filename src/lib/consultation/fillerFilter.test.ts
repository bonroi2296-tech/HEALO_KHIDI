import { describe, it, expect } from "vitest";
import { isFillerOnly } from "./fillerFilter";

describe("isFillerOnly", () => {
  it("빈/공백/문장부호만 → true(스킵)", () => {
    expect(isFillerOnly("")).toBe(true);
    expect(isFillerOnly("   ")).toBe(true);
    expect(isFillerOnly("…")).toBe(true);
    expect(isFillerOnly("~?.")).toBe(true);
  });

  it("각 언어 추임새만 → true", () => {
    // ko
    expect(isFillerOnly("음")).toBe(true);
    expect(isFillerOnly("어어")).toBe(true);
    expect(isFillerOnly("음... 어")).toBe(true);
    // en
    expect(isFillerOnly("um")).toBe(true);
    expect(isFillerOnly("uhh")).toBe(true);
    expect(isFillerOnly("hmm")).toBe(true);
    // ru
    expect(isFillerOnly("э")).toBe(true);
    expect(isFillerOnly("ну")).toBe(true);
    // zh
    expect(isFillerOnly("嗯")).toBe(true);
    // ja (えっと / えー / あのー / えーと(장음 표기) 모두 커버)
    expect(isFillerOnly("えっと")).toBe(true);
    expect(isFillerOnly("えー")).toBe(true);
    expect(isFillerOnly("えーと")).toBe(true);
    expect(isFillerOnly("あのー")).toBe(true);
  });

  it("의미 있는 한 단어 대답은 절대 추임새로 보지 않음(자막 누락 방지)", () => {
    expect(isFillerOnly("네")).toBe(false);
    expect(isFillerOnly("да")).toBe(false);
    expect(isFillerOnly("yes")).toBe(false);
    expect(isFillerOnly("是")).toBe(false);
    expect(isFillerOnly("はい")).toBe(false);
  });

  it("내용이 한 단어라도 섞이면 false(보수적)", () => {
    expect(isFillerOnly("음 안녕하세요")).toBe(false);
    expect(isFillerOnly("um okay")).toBe(false);
    expect(isFillerOnly("어 그게 말이죠")).toBe(false);
  });
});
