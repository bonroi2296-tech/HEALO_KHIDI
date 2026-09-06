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
  DEFAULT_THINKING_LEVEL,
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

  it("강등 도중 만난 5xx 로 memo 를 고착하지 않는다 — 성공(2xx)만 커밋 (리뷰 F2)", async () => {
    const bodies: any[] = [];
    let call = 0;
    global.fetch = vi.fn(async (_url: any, init: any) => {
      bodies.push(JSON.parse(init.body));
      call++;
      if (call === 1) return new Response("{}", { status: 400 }); // rung 0 거절
      if (call === 2) return new Response("{}", { status: 503 }); // rung 1 시도 중 일시 오류
      return new Response("{}", { status: 200 });
    }) as any;

    const res1 = await fetchGeminiWithCompat("https://x/y", REST_BODY);
    expect(res1.status).toBe(503); // 5xx 는 그대로 반환하되
    // 다음 호출은 다시 rung 0(원본 thinkingBudget)부터 — memo 미커밋 증명
    const res2 = await fetchGeminiWithCompat("https://x/y", REST_BODY);
    expect(res2.status).toBe(200);
    expect(bodies[2].generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });
});

// ── 샘플링 파라미터 폐기(2026-07-21 구글 공지) 대응 칸 ────────────────────────
// temperature/topP/topK 는 지금은 "조용히 무시", 새 세대에서는 400. 7-23 과 같은 부류라
// 같은 사다리로 흡수한다. 여기서 잠그는 계약의 핵심은 **순서와 memo 정책** 이다.
describe("geminiThinkingCompat — 샘플링 파라미터 거절", () => {
  const savedFetch = global.fetch;
  beforeEach(() => _resetThinkingCompat());
  afterEach(() => {
    global.fetch = savedFetch;
  });

  const SAMPLED = { ...BASE_PARAMS, temperature: 0.1 };

  it("temperature 거절 → temperature 만 떼고 thinking 설정은 보존 (돈 안 쓰는 칸 우선)", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.temperature !== undefined) throw rejection("Unknown field: temperature");
      return p;
    });
    const out: any = await callGeminiWithCompat(fn, SAMPLED);
    expect(out.temperature).toBeUndefined();
    // 핵심: thinkingBudget:0 이 그대로 남아야 한다(강등되면 생각 토큰 = 돈이 늘어난다)
    expect(out.providerOptions.google.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("thinking 만 거절되는 세대에서는 temperature 를 떼지 않는다 (번역 충실도 회귀 방지)", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.providerOptions?.google?.thinkingConfig?.thinkingBudget !== undefined) {
        throw rejection();
      }
      return p;
    });
    const out: any = await callGeminiWithCompat(fn, SAMPLED);
    // strip 칸은 시도되지만 실패하므로 memo 에 안 남고, 성공한 칸은 minimal 이다
    expect(out.providerOptions.google.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
    expect(out.temperature).toBe(0.1);
  });

  it("thinking·샘플링이 동시에 거절되면 조합 칸(minimal+strip)까지 내려간다", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.temperature !== undefined) throw rejection("Unknown field: temperature");
      if (p.providerOptions?.google?.thinkingConfig?.thinkingBudget !== undefined) {
        throw rejection();
      }
      return p;
    });
    const out: any = await callGeminiWithCompat(fn, SAMPLED);
    expect(out.temperature).toBeUndefined();
    expect(out.providerOptions.google.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
  });

  it("topP·topK 도 같이 떼며, 온도 없는 호출부의 사다리에는 strip 칸이 아예 안 생긴다", async () => {
    const fn = vi.fn(async (p: any) => {
      if (p.topP !== undefined || p.topK !== undefined) throw rejection("unknown field");
      return "ok";
    });
    await callGeminiWithCompat(fn, { ...BASE_PARAMS, topP: 0.9, topK: 40 });
    expect(fn.mock.calls[1][0].topP).toBeUndefined();
    expect(fn.mock.calls[1][0].topK).toBeUndefined();

    // 온도 없는 파라미터(BASE_PARAMS)는 strip 칸이 무의미 → 헛시도 없이 thinking 칸으로
    _resetThinkingCompat();
    const fn2 = vi.fn(async (p: any) => {
      if (p.providerOptions?.google?.thinkingConfig?.thinkingBudget !== undefined) throw rejection();
      return "ok";
    });
    await callGeminiWithCompat(fn2, BASE_PARAMS);
    expect(fn2).toHaveBeenCalledTimes(2); // 원본 → minimal (strip 왕복 없음)
  });

  it("REST 경로도 generationConfig.temperature 를 떼어 살아난다", async () => {
    const bodies: any[] = [];
    global.fetch = vi.fn(async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      const ok = body.generationConfig?.temperature === undefined;
      return new Response("{}", { status: ok ? 200 : 400 });
    }) as any;

    const res = await fetchGeminiWithCompat("https://x/y", {
      contents: [],
      generationConfig: { temperature: 0, maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } },
    });
    expect(res.status).toBe(200);
    expect(bodies[1].generationConfig.temperature).toBeUndefined();
    // maxOutputTokens·thinkingConfig 는 보존 — 과잉 강등 금지
    expect(bodies[1].generationConfig.maxOutputTokens).toBe(100);
    expect(bodies[1].generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("memo 는 «칸 번호» 가 아니라 «집합 키» — 모양이 다른 호출부끼리 뜻이 안 섞인다", async () => {
    // 1) 온도 있는 호출부가 strip 칸에서 성공 → memo="strip"
    const fnA = vi.fn(async (p: any) => {
      if (p.temperature !== undefined) throw rejection("unknown field");
      return "A";
    });
    await callGeminiWithCompat(fnA, SAMPLED);
    expect(fnA).toHaveBeenCalledTimes(2);

    // 2) 온도 없는 호출부는 사다리에 "strip" 이 없으므로 원본(0번)부터 — 그리고 성공한다.
    //    번호로 기억했다면 여기서 엉뚱한 칸(thinking 강등)으로 출발해 돈이 늘었을 것.
    const seen: any[] = [];
    const fnB = vi.fn(async (p: any) => {
      seen.push(p);
      return "B";
    });
    const out = await callGeminiWithCompat(fnB, BASE_PARAMS);
    expect(out).toBe("B");
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(seen[0].providerOptions.google.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });
});

describe("geminiThinkingCompat — 기본값 «low» 와 alreadyLow 사다리 (2026-09-06)", () => {
  beforeEach(() => _resetThinkingCompat());

  it("DEFAULT_THINKING_LEVEL 은 low — 지금 세대가 minimal 을 400 으로 거절하므로 첫 요청부터 200 이어야 한다", () => {
    expect(DEFAULT_THINKING_LEVEL).toBe("low");
  });

  it("원본이 low 면 SDK 사다리에 minimal·low 칸이 없다 — 거절 시 곧장 «생각 제어 없음»", async () => {
    const params = {
      ...BASE_PARAMS,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" }, safetySettings: [] } },
    };
    const fn = vi.fn(async (p: any) => {
      const tc = p.providerOptions?.google?.thinkingConfig;
      if (tc) throw rejection("Thinking level LOW is not supported for this model.");
      return "ok";
    });
    const out = await callGeminiWithCompat(fn, params);
    expect(out).toBe("ok");
    // 원본(low) → dropThinking. minimal 로 «내려가 보는» 헛왕복이 없어야 한다.
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1][0].providerOptions.google.thinkingConfig).toBeUndefined();
  });

  it("원본이 low 이고 모델이 받으면 1회 호출로 끝난다(오늘의 실서비스 경로)", async () => {
    const params = {
      ...BASE_PARAMS,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    };
    const fn = vi.fn(async (p: any) => p.providerOptions.google.thinkingConfig);
    expect(await callGeminiWithCompat(fn, params)).toEqual({ thinkingLevel: "low" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("REST 도 같다 — low 원본이 400 이면 minimal 을 건너뛰고 thinkingConfig 를 뺀다", async () => {
    const bodies: any[] = [];
    const fetchMock = vi.fn(async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      bodies.push(b);
      const ok = !b.generationConfig.thinkingConfig;
      return new Response(ok ? "{}" : "bad", { status: ok ? 200 : 400 });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const res = await fetchGeminiWithCompat("https://x", {
        generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingLevel: "low" } },
      });
      expect(res.status).toBe(200);
      expect(bodies).toHaveLength(2);
      expect(bodies[1].generationConfig.thinkingConfig).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
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
