/**
 * 계약 테스트 — Gemini 별칭 세대 교체 생존 사다리
 *
 * 실사고(2026-07-23): gemini-flash-latest 별칭이 새 세대로 자동 교체되며 thinkingBudget:0
 * 요청을 전면 400 거절 → 웹 챗·텔레그램·판사 전 채널 AI 불능. 이 사다리가 그 부류
 * (외부 모델 세대 교체로 인한 파라미터 거절)를 코드 배포 없이 런타임에 흡수하는 계약을 잠근다.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  callGeminiWithCompat,
  fetchGeminiWithCompat,
  isParamRejection,
  _resetThinkingCompat,
} from "./geminiThinkingCompat";

const BASE_PARAMS = {
  model: "m",
  system: "s",
  maxOutputTokens: 100,
  providerOptions: {
    google: {
      thinkingConfig: { thinkingBudget: 0 },
      safetySettings: [{ category: "X", threshold: "BLOCK_NONE" }],
    },
  },
};

function rejection(msg = "Request contains an invalid argument.") {
  const e: any = new Error(msg);
  e.statusCode = 400;
  return e;
}

describe("geminiThinkingCompat — SDK 사다리", () => {
  beforeEach(() => _resetThinkingCompat());

  it("구세대 모델(원본 수용)은 원본 그대로 1회 호출", async () => {
    const fn = vi.fn(async (p: any) => p.providerOptions.google.thinkingConfig);
    const out = await callGeminiWithCompat(fn, BASE_PARAMS);
    expect(out).toEqual({ thinkingBudget: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("thinkingBudget 거절 → thinkingLevel:minimal 로 강등해 성공 (2026-07-23 사고 시나리오)", async () => {
    const fn = vi.fn(async (p: any) => {
      const tc = p.providerOptions?.google?.thinkingConfig;
      if (tc?.thinkingBudget !== undefined) throw rejection();
      return tc;
    });
    const out = await callGeminiWithCompat(fn, BASE_PARAMS);
    expect(out).toEqual({ thinkingLevel: "minimal" });
    // safetySettings 는 보존된다(불필요한 과잉 강등 금지)
    expect(fn.mock.calls[1][0].providerOptions.google.safetySettings).toBeTruthy();
  });

  it("성공한 칸을 기억해 다음 호출은 실패 왕복 없이 바로 그 칸으로", async () => {
    const fn = vi.fn(async (p: any) => {
      const tc = p.providerOptions?.google?.thinkingConfig;
      if (tc?.thinkingBudget !== undefined) throw rejection();
      return "ok";
    });
    await callGeminiWithCompat(fn, BASE_PARAMS); // 2회 (거절→성공)
    await callGeminiWithCompat(fn, BASE_PARAMS); // 1회 (memo 칸 직행)
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("thinking 계열 전부 거절 → thinkingConfig 제거로 강등", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.providerOptions?.google?.thinkingConfig) throw rejection();
      return p.providerOptions?.google ? "no-thinking" : "no-google";
    });
    const out = await callGeminiWithCompat(fn, BASE_PARAMS);
    expect(out).toBe("no-thinking");
  });

  it("google 옵션 전체가 문제면 마지막 칸(옵션 통째 제거)까지 강등", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.providerOptions?.google) throw rejection("unknown field");
      return "bare";
    });
    const out = await callGeminiWithCompat(fn, BASE_PARAMS);
    expect(out).toBe("bare");
  });

  it("파라미터 거절이 아닌 오류(503 등)는 즉시 던진다 — 일시 오류 재시도는 호출부 몫", async () => {
    const e: any = new Error("overloaded");
    e.statusCode = 503;
    const fn = vi.fn(async () => {
      throw e;
    });
    await expect(callGeminiWithCompat(fn, BASE_PARAMS)).rejects.toThrow("overloaded");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("모든 칸이 거절되면 마지막 거절 오류를 던진다", async () => {
    const fn = vi.fn(async () => {
      throw rejection();
    });
    await expect(callGeminiWithCompat(fn, BASE_PARAMS)).rejects.toThrow("invalid argument");
  });
});

describe("geminiThinkingCompat — REST 사다리", () => {
  const realFetch = global.fetch;
  beforeEach(() => _resetThinkingCompat());
  afterEach(() => {
    global.fetch = realFetch;
  });

  const REST_BODY = {
    contents: [{ role: "user", parts: [{ text: "q" }] }],
    generationConfig: { maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } },
  };

  it("400 이면 thinking 설정을 강등해 재시도, 두 번째 200 을 반환", async () => {
    const bodies: any[] = [];
    global.fetch = vi.fn(async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      const ok = body.generationConfig?.thinkingConfig?.thinkingBudget === undefined;
      return new Response("{}", { status: ok ? 200 : 400 });
    }) as any;

    const res = await fetchGeminiWithCompat("https://x/y", REST_BODY);
    expect(res.status).toBe(200);
    expect(bodies[0].generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(bodies[1].generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
  });

  it("400 이 아닌 실패(500 등)는 강등 없이 그대로 반환(호출부 res.ok 처리 유지)", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 500 })) as any;
    const res = await fetchGeminiWithCompat("https://x/y", REST_BODY);
    expect(res.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("isParamRejection", () => {
  it("400/INVALID_ARGUMENT/not supported 를 거절로 판정", () => {
    expect(isParamRejection(rejection())).toBe(true);
    expect(isParamRejection(new Error("Thinking level is not supported for this model"))).toBe(true);
    const e503: any = new Error("Service Unavailable");
    e503.statusCode = 503;
    expect(isParamRejection(e503)).toBe(false);
  });
});
