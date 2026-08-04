// 유입 기록의 «틀리면 자료가 통째로 쓸모없어지는» 두 지점만 검사한다:
//  ① 내부 이동을 유입으로 세지 않는가  ② 첫 진입 값을 나중 이동이 덮어쓰지 않는가
// (환경이 node 라 sessionStorage·location·document 를 직접 심는다)
import { describe, it, expect, beforeEach } from "vitest";
import { captureArrival, getArrival, safeLandingPath, safeUtm } from "./arrival.js";

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

describe("safeLandingPath", () => {
  it("주소에 박힌 비밀 열쇠는 지운다", () => {
    // 상담 초대 링크 · 설문 · 의견서 — 전부 주소 자체가 열쇠다
    expect(safeLandingPath("/c/8abafd093c184320a8a0bf9d95f289e5")).toBe("/c/:token");
    expect(safeLandingPath("/survey/51166d8c-cdef-4291-ab30-350b6d5d0e92")).toBe("/survey/:token");
    expect(safeLandingPath("/ru/opinions/3475604f37c04c5e8f41c8d03823d58e/view")).toBe("/ru/opinions/:token/view");
  });

  it("진짜 페이지 경로는 건드리지 않는다(집계가 뭉개지면 안 된다)", () => {
    for (const p of ["/ru/cost-calculator", "/kk/for-kazakh-patients", "/faq", "/ko/inquiry",
                     "/hospitals/ewha-seoul", "/treatments/gastric-cancer"]) {
      expect(safeLandingPath(p)).toBe(p);
    }
  });

  it("값이 없으면 조용히 비운다", () => {
    for (const v of [null, undefined, "", 42]) expect(safeLandingPath(v)).toBeNull();
  });
});

describe("safeUtm", () => {
  it("아는 세 칸만 남긴다 — 나머지는 버린다", () => {
    expect(safeUtm({ utm_source: "google", utm_campaign: "kz", 몰래: "x", nested: { a: 1 } }))
      .toEqual({ utm_source: "google", utm_campaign: "kz" });
  });

  it("값이 길면 자른다(표를 부풀리지 못하게)", () => {
    const r = safeUtm({ utm_source: "a".repeat(500) });
    expect(r?.utm_source?.length).toBe(60);
  });

  it("객체가 아니거나 쓸 값이 없으면 비운다", () => {
    for (const v of [null, undefined, "google", 42, [], {}, { 몰래: "x" }, { utm_source: 5 }]) {
      expect(safeUtm(v)).toBeNull();
    }
  });
});
