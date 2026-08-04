// 유입 기록의 «틀리면 자료가 통째로 쓸모없어지는» 두 지점만 검사한다:
//  ① 내부 이동을 유입으로 세지 않는가  ② 첫 진입 값을 나중 이동이 덮어쓰지 않는가
// (환경이 node 라 sessionStorage·location·document 를 직접 심는다)
import { describe, it, expect, beforeEach } from "vitest";
import { captureArrival, getArrival } from "./arrival.js";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

function visit(url: string, referrer: string) {
  const u = new URL(url);
  (globalThis as any).location = { search: u.search, pathname: u.pathname, hostname: u.hostname };
  (globalThis as any).document = { referrer };
}

beforeEach(() => {
  (globalThis as any).sessionStorage = fakeStorage();
});

describe("captureArrival", () => {
  it("바깥에서 온 방문은 유입처·캠페인·첫 페이지를 남긴다", () => {
    visit("https://healwith.co.kr/ru/cost-calculator?utm_source=google&utm_campaign=kz_cancer", "https://www.google.com/search?q=...");
    captureArrival();

    expect(getArrival("ru")).toEqual({
      sourceLocale: "ru",
      referrerHost: "www.google.com",
      landingPath: "/ru/cost-calculator",
      utm: { utm_source: "google", utm_campaign: "kz_cancer" },
    });
  });

  it("우리 사이트 안에서 넘어온 것은 유입처로 세지 않는다", () => {
    visit("https://healwith.co.kr/inquiry", "https://healwith.co.kr/faq");
    captureArrival();

    expect(getArrival("en").referrerHost).toBeNull();
  });

  it("첫 진입 값이 이후 페이지 이동으로 덮이지 않는다", () => {
    visit("https://healwith.co.kr/ru/faq", "https://yandex.ru/search/");
    captureArrival();

    // 사이트 안에서 문의 폼으로 이동 — 여기서 다시 재면 referrer 가 우리 도메인이 된다.
    visit("https://healwith.co.kr/inquiry", "https://healwith.co.kr/ru/faq");
    captureArrival();

    const a = getArrival("ru");
    expect(a.referrerHost).toBe("yandex.ru");
    expect(a.landingPath).toBe("/ru/faq");
  });

  it("저장소가 막힌 브라우저에서도 터지지 않는다", () => {
    (globalThis as any).sessionStorage = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
    };
    visit("https://healwith.co.kr/", "");

    expect(() => captureArrival()).not.toThrow();
    expect(getArrival("kz")).toEqual({ sourceLocale: "kz", referrerHost: null, landingPath: null, utm: null });
  });
});
