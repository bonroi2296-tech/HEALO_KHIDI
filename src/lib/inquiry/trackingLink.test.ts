/**
 * 진행상황 주소 조립 — 세 곳(완료 화면·확인 메일·메신저 봇)이 «같은 주소»를 만들어야 한다.
 * 여기가 어긋나면 환자가 받은 주소가 404 나거나, 언어 prefix 가 붙어 rewrite 대상이 아닌
 * 경로로 새어 나간다(그게 실제로 처음 짤 때 낸 실수다).
 */

import { describe, it, expect } from "vitest";
import { trackingUrl, trackingMessageLine, toTrackingLang } from "./trackingLink";

describe("trackingUrl", () => {
  it("언어 prefix 를 붙이지 않는다 — /claim/ 은 proxy 가 언어를 주입하는 경로다", () => {
    expect(trackingUrl("https://healwith.co.kr", "abc-123")).toBe("https://healwith.co.kr/claim/abc-123");
  });

  it("기준 주소 끝의 슬래시가 겹치지 않는다", () => {
    expect(trackingUrl("https://healwith.co.kr/", "abc-123")).toBe("https://healwith.co.kr/claim/abc-123");
  });
  it("받는 사람 언어는 ?lang= 로 싣는다(메신저 미리보기 봇용) — kk→kz, 모르면 안 붙인다", () => {
    expect(trackingUrl("https://healwith.co.kr", "abc-123", "ru")).toBe("https://healwith.co.kr/claim/abc-123?lang=ru");
    expect(trackingUrl("https://healwith.co.kr", "abc-123", "kk")).toBe("https://healwith.co.kr/claim/abc-123?lang=kz");
    expect(trackingUrl("https://healwith.co.kr", "abc-123", "xx")).toBe("https://healwith.co.kr/claim/abc-123");
    expect(trackingUrl("https://healwith.co.kr", "abc-123", null)).toBe("https://healwith.co.kr/claim/abc-123");
  });
});

describe("toTrackingLang", () => {
  it("활성 6개 언어는 그대로", () => {
    expect(toTrackingLang("ru")).toBe("ru");
    expect(toTrackingLang("KZ")).toBe("kz");
    expect(toTrackingLang("kk")).toBe("kz"); // ISO 코드도 내부 코드로 — 주소의 ?lang 과 같은 자(독립 리뷰 2026-09-05)
  });

  it("모르는 언어·빈 값은 영어로", () => {
    expect(toTrackingLang("vi")).toBe("en");
    expect(toTrackingLang(null)).toBe("en");
  });
});

describe("trackingMessageLine", () => {
  it("어떤 언어든 주소를 반드시 포함한다 (봇이 주소 없는 안내만 보내면 무의미)", () => {
    const url = "https://healwith.co.kr/claim/abc-123";
    for (const lang of ["ko", "en", "ru", "kz", "zh", "ja"] as const) {
      expect(trackingMessageLine(url, lang)).toContain(url);
    }
  });
});
