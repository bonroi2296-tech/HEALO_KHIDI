/**
 * 센트리를 «화면 다 뜬 뒤(load)»에 켜는 구조의 안전장치 검사.
 *
 * 늦게 켜면 그 사이에 난 에러를 놓친다 → sentry.client.config.js 는 임시 수신함을 두고
 * init 직후 밀어 넣는다. 그 버퍼가 이 변경의 «에러를 잃지 않는» 유일한 근거라, 조용히
 * 깨지면 «빠른데 에러를 놓치는» 상태가 된다(겉으로 티가 안 난다) → 검사로 박아둔다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const init = vi.fn();
const captureException = vi.fn();
const replayIntegration = vi.fn(() => ({ name: "Replay" }));

vi.mock("@sentry/nextjs", () => ({ init, captureException, replayIntegration }));

/** 브라우저 흉내 — node 환경이라 jsdom 없이 필요한 것만 세운다. */
function stubBrowser(readyState: "loading" | "complete") {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  let idleCb: (() => void) | null = null;
  const win = {
    addEventListener: (t: string, fn: (e: unknown) => void) => {
      (listeners[t] ||= []).push(fn);
    },
    removeEventListener: (t: string, fn: (e: unknown) => void) => {
      listeners[t] = (listeners[t] || []).filter((f) => f !== fn);
    },
    requestIdleCallback: (fn: () => void) => {
      idleCb = fn;
    },
  };
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = {
    readyState,
    documentElement: { className: "", lang: "ko" },
  };
  // navigator 는 node 에서 읽기전용이고 beforeSend 안에서만 쓰이므로 흉내내지 않는다
  return {
    fire: (type: string, e: unknown) => (listeners[type] || []).forEach((fn) => fn(e)),
    runIdle: () => idleCb?.(),
    listenerCount: (t: string) => (listeners[t] || []).length,
  };
}

describe("센트리 늦게 켜기 — 그 사이 에러를 잃지 않는다", () => {
  beforeEach(() => {
    vi.resetModules();
    init.mockClear();
    captureException.mockClear();
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://k@o0.ingest.sentry.io/0";
  });

  it("켜지기 전에 난 에러를 init 뒤에 late_init 태그로 넘긴다", async () => {
    const browser = stubBrowser("loading");
    await import("../../sentry.client.config.js");

    // 아직 SDK 는 안 붙은 시점 — 로딩 중 에러 2건
    expect(init).not.toHaveBeenCalled();
    const boom = new Error("hydration 실패");
    browser.fire("error", { error: boom });
    browser.fire("unhandledrejection", { reason: "약속 거절" });

    // 화면이 다 뜨고(load) 한가해지면(idle) 그때 켜진다
    browser.fire("load", {});
    browser.runIdle();
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));

    expect(captureException).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(boom, { tags: { late_init: "yes" } });
    expect(captureException).toHaveBeenCalledWith("약속 거절", { tags: { late_init: "yes" } });
    // 수신함은 비우고 손을 뗀다 — 이후 에러는 SDK 가 직접 잡는다
    expect(browser.listenerCount("error")).toBe(0);
  });

  it("이미 다 뜬 상태(readyState=complete)에서도 켜진다", async () => {
    const browser = stubBrowser("complete");
    await import("../../sentry.client.config.js");
    browser.runIdle();
    await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("DSN 이 없으면 아무것도 안 한다(수신함도 안 건다)", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const browser = stubBrowser("loading");
    await import("../../sentry.client.config.js");
    expect(browser.listenerCount("error")).toBe(0);
    expect(init).not.toHaveBeenCalled();
  });
});
