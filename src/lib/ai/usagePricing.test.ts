import { describe, it, expect } from "vitest";
import { estimateCostUsd, normalizeUsage, priceForModel } from "./usagePricing";

describe("priceForModel", () => {
  it("임베딩 모델은 출력 단가 0", () => {
    const p = priceForModel("gemini-embedding-001");
    expect(p.outputPer1M).toBe(0);
  });
  it("flash 별칭/미상 모델은 flash 단가로 보수적 추정", () => {
    const flash = priceForModel("gemini-flash-latest");
    const unknown = priceForModel("some-future-model");
    expect(flash.outputPer1M).toBeGreaterThan(0);
    expect(unknown).toEqual(flash);
  });
});

describe("normalizeUsage", () => {
  it("promptTokens/completionTokens 형태 흡수", () => {
    const n = normalizeUsage({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    expect(n).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
  });
  it("inputTokens/outputTokens(신버전) 형태 흡수 + total 계산", () => {
    const n = normalizeUsage({ inputTokens: 10, outputTokens: 20 });
    expect(n.promptTokens).toBe(10);
    expect(n.completionTokens).toBe(20);
    expect(n.totalTokens).toBe(30);
  });
  it("null/비객체는 전부 null", () => {
    expect(normalizeUsage(null)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null });
    expect(normalizeUsage(undefined)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null });
  });
});

describe("estimateCostUsd", () => {
  it("토큰 미상이면 0", () => {
    expect(estimateCostUsd("gemini-flash-latest", null, null)).toBe(0);
  });
  it("입력/출력 단가를 분리 적용(기본 in 1.5 / out 7.5 per 1M — 3.6 Flash)", () => {
    // 1M 입력 + 1M 출력 = 1.5 + 7.5 = 9.0 USD
    // 2026-07-27: 별칭이 3.6 Flash 로 이동한 것을 실호출(modelVersion)로 확인해 out 9.0→7.5.
    expect(estimateCostUsd("gemini-flash-latest", 1_000_000, 1_000_000)).toBeCloseTo(9.0, 6);
  });
  it("소액도 6자리까지 보존", () => {
    // 1000 입력 토큰 = 1000/1e6 * 1.5 = 0.0015
    expect(estimateCostUsd("gemini-flash-latest", 1000, 0)).toBeCloseTo(0.0015, 6);
  });
});
