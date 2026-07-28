/**
 * 센트리를 «에러 · 첫 조작 · 15초» 중 가장 먼저 오는 것에 켜는 구조의 안전장치 검사.
 *
 * 늦게 켜면 그 사이에 난 에러를 놓친다 → sentry.client.config.js 는 임시 수신함을 두고
 * init 직후 밀어 넣으며, «에러가 들어오면 즉시 켠다». 그 두 장치가 이 변경의 «에러를 잃지
 * 않는» 유일한 근거이고, 조용히 깨지면 «빠른데 에러를 놓치는» 상태가 된다(겉으로 티가 안 난다).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const init = vi.fn();
const captureException = vi.fn();
const replayIntegration = vi.fn(() => ({ name: "Replay" }));

vi.mock("@sentry/nextjs", () => ({ init, captureException, replayIntegration }));

/** 브라우저 흉내 — node 환경이라 jsdom 없이 필요한 것만 세운다. */
function stubBrowser() {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const win = {
    addEventListener: (t: string, fn: (e: unknown) => void) => {
      (listeners[t] ||= []).push(fn);
    },
    removeEventListener: (t: string, fn: (e: unknown) => void) => {
      listeners[t] = (listeners[t] || []).filter((f) => f !== fn);
    },
  };
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = {
    readyState: "loading",
    documentElement: { className: "", lang: "ko" },
  };
  return {
    fire: (type: string, e?: unknown) => (listeners[type] || []).forEach((fn) => fn(e)),
    listenerCount: (t: string) => (listeners[t] || []).length,
  };
}

describe("센트리 늦게 켜기 — 에러를 잃지 않는다", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    init.mockClear();
    captureException.mockClear();
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://k@o0.ingest.sentry.io/0";
  });

  // node 전역에 심어둔 가짜 브라우저를 치운다 — 안 치우면 같은 워커의 다른 검사가
  // «window 가 있는 node» 라는 이상한 환경에서 돌아 원인 찾기 어려운 실패를 낸다.
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it("에러가 나면 «즉시» 켜고, 그 에러를 late_init 태그로 넘긴다", async () => {
    const browser = stubBrowser();
    await import("../../sentry.client.config.js");
    expect(init).not.toHaveBeenCalled(); // 가만히 있으면 안 켜진다

    const boom = new Error("hydration 실패");
    browser.fire("error", { error: boom });

    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
    expect(captureException).toHaveBeenCalledWith(boom, { tags: { late_init: "yes" } });
    // 수신함은 비우고 손을 뗀다 — 이후 에러는 SDK 가 직접 잡는다
    expect(browser.listenerCount("error")).toBe(0);
  });

  it("약속 거절(unhandledrejection)도 같은 경로로 잡는다", async () => {
    const browser = stubBrowser();
    await import("../../sentry.client.config.js");
    browser.fire("unhandledrejection", { reason: "약속 거절" });
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
    expect(captureException).toHaveBeenCalledWith("약속 거절", { tags: { late_init: "yes" } });
  });

  it("사용자가 화면을 만지면 켜진다", async () => {
    const browser = stubBrowser();
    await import("../../sentry.client.config.js");
    browser.fire("pointerdown");
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("아무 일이 없어도 15초 뒤에는 켜진다", async () => {
    stubBrowser();
    await import("../../sentry.client.config.js");
    vi.advanceTimersByTime(15000);
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("여러 방아쇠가 겹쳐도 한 번만 켠다", async () => {
    const browser = stubBrowser();
    await import("../../sentry.client.config.js");
    browser.fire("error", { error: new Error("첫 번째") });
    browser.fire("pointerdown");
    vi.advanceTimersByTime(20000);
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("DSN 이 없으면 아무것도 안 한다(수신함도 안 건다)", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const browser = stubBrowser();
    await import("../../sentry.client.config.js");
    expect(browser.listenerCount("error")).toBe(0);
    vi.advanceTimersByTime(20000);
    expect(init).not.toHaveBeenCalled();
  });
});
