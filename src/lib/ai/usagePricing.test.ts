import { describe, it, expect } from "vitest";
import { CACHED_INPUT_RATE, estimateCostUsd, normalizeUsage, priceForModel } from "./usagePricing";

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
    expect(n).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 ,
      cachedTokens: null,});
  });
  it("inputTokens/outputTokens(신버전) 형태 흡수 + total 계산", () => {
    const n = normalizeUsage({ inputTokens: 10, outputTokens: 20 });
    expect(n.promptTokens).toBe(10);
    expect(n.completionTokens).toBe(20);
    expect(n.totalTokens).toBe(30);
  });
  it("null/비객체는 전부 null", () => {
    expect(normalizeUsage(null)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null ,
      cachedTokens: null,});
    expect(normalizeUsage(undefined)).toEqual({ promptTokens: null, completionTokens: null, totalTokens: null ,
      cachedTokens: null,});
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

describe("normalizeUsage — 생각 토큰(2026-08-14)", () => {
  it("생각 토큰을 출력에 합산한다 (안 더하면 출력 비용이 절반 이하로 새어나간다)", () => {
    // 실측 형태: 답변 411 + 생각 631 = 청구되는 출력 1042
    expect(normalizeUsage({ promptTokens: 95, completionTokens: 411, thoughtsTokenCount: 631 })).toEqual({
      promptTokens: 95,
      completionTokens: 1042,
      totalTokens: 1137,
      cachedTokens: null,
    });
  });
  it("SDK 가 reasoningTokens 이름으로 줘도 흡수", () => {
    expect(normalizeUsage({ inputTokens: 10, outputTokens: 20, reasoningTokens: 30 }).completionTokens).toBe(50);
  });
  it("생각 토큰이 없으면 종전과 동일", () => {
    expect(normalizeUsage({ promptTokens: 10, completionTokens: 20 })).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      cachedTokens: null,
    });
  });
});

// ── 캐시 적중 토큰 (2026-08-11) ────────────────────────────────
// 왜: 제미나이 자동 캐시가 걸리면 그 입력 토큰은 정가의 약 10% 로 매겨진다. 이걸 안 반영하면
//     캐시가 걸려도 «비용이 그대로»로 보여서 개선이 됐는지 안 됐는지 판단이 안 된다.
describe("캐시 적중 토큰", () => {
  // ⚠️ 이 시험이 있는 이유: 처음에 `cachedInputTokens` 라는 «없는 이름»을 봤다가
  //    조용히 0건 기록될 뻔했다. 아래 첫 케이스가 **설치된 판(ai 6.0.168)의 실제 모양**이다.
  //    (구글 제공자가 promptTokenCount/cachedContentTokenCount 를
  //     inputTokens.total / inputTokens.cacheRead 로 옮기고, ai 코어가
  //     usage.inputTokenDetails.cacheReadTokens 로 넘겨준다.)
  it("설치된 판의 실제 자리(inputTokenDetails.cacheReadTokens)를 읽는다", () => {
    const usage = {
      inputTokens: 5000,
      inputTokenDetails: { noCacheTokens: 1990, cacheReadTokens: 3010, cacheWriteTokens: undefined },
      outputTokens: 141,
    };
    expect(normalizeUsage(usage).cachedTokens).toBe(3010);
    // inputTokens 는 캐시분을 «포함한» 총량이다 — 그래서 비용에서 빼는 계산이 맞다.
    expect(normalizeUsage(usage).promptTokens).toBe(5000);
  });

  it("자리가 바뀌어도 계측이 죽지 않게 옛/대체 이름도 받는다", () => {
    expect(normalizeUsage({ inputTokens: 100, outputTokens: 10, cachedInputTokens: 80 }).cachedTokens).toBe(80);
    expect(normalizeUsage({ inputTokens: 100, outputTokens: 10, cachedContentTokenCount: 70 }).cachedTokens).toBe(70);
    expect(normalizeUsage({ inputTokens: 100, outputTokens: 10, cacheReadInputTokens: 60 }).cachedTokens).toBe(60);
  });

  it("캐시가 안 걸린 응답은 0 으로 기록된다(«못 잼»인 null 과 구별)", () => {
    const miss = normalizeUsage({
      inputTokens: 5000,
      inputTokenDetails: { noCacheTokens: 5000, cacheReadTokens: 0 },
      outputTokens: 141,
    });
    expect(miss.cachedTokens).toBe(0);
    expect(normalizeUsage({ inputTokens: 5000, outputTokens: 141 }).cachedTokens).toBeNull();
  });

  it("캐시로 재사용된 입력은 정가의 10% 로 매긴다", () => {
    const full = estimateCostUsd("gemini-flash-latest", 1_000_000, 0);
    const allCached = estimateCostUsd("gemini-flash-latest", 1_000_000, 0, 1_000_000);
    expect(allCached).toBeCloseTo(full * CACHED_INPUT_RATE, 6);
  });

  it("안 넘기면 예전 계산과 완전히 같다(기존 기록에 소급 영향 없음)", () => {
    expect(estimateCostUsd("gemini-flash-latest", 5000, 140)).toBe(
      estimateCostUsd("gemini-flash-latest", 5000, 140, null)
    );
  });

  it("캐시 토큰이 입력보다 크게 와도 음수 단가가 안 나온다", () => {
    const c = estimateCostUsd("gemini-flash-latest", 1000, 0, 999_999);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeCloseTo(estimateCostUsd("gemini-flash-latest", 1000, 0, 1000), 6);
  });
});
