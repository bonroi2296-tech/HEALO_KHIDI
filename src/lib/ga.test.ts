import { describe, it, expect, afterEach, vi } from "vitest";
import { hasAnalyticsConsent } from "./ga";

// vitest 환경이 'node'(window 없음)라 케이스별로 window.localStorage 를 스텁한다.
function stubConsent(getItem: () => string | null) {
  vi.stubGlobal("window", { localStorage: { getItem } });
}

describe("hasAnalyticsConsent (분석툴 로드 게이트)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it('"all" 동의면 true', () => {
    stubConsent(() => "all");
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('"essential"이면 false (Essential Only 선택 시 추적 금지)', () => {
    stubConsent(() => "essential");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("동의 키가 없으면 false (배너 무시/미선택 = 추적 안 함)", () => {
    stubConsent(() => null);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("localStorage 접근이 막히면 false (안전 기본값)", () => {
    stubConsent(() => {
      throw new Error("blocked");
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("SSR(window 없음)이면 false", () => {
    // window 미스텁 상태 = node 환경에서 typeof window === 'undefined'
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
