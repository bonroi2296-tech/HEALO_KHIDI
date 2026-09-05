import { describe, it, expect } from "vitest";
import { acceptLanguageCandidates, normalizeLocaleParam, pickGuestLocale, resolveGuestLocale, withLang } from "./guestLinkLang";

describe("normalizeLocaleParam", () => {
  it("6개 언어만, kk→kz, 지역 꼬리·대소문자 무시", () => {
    expect(normalizeLocaleParam("ru")).toBe("ru");
    expect(normalizeLocaleParam("kk")).toBe("kz");
    expect(normalizeLocaleParam("KK-KZ")).toBe("kz");
    expect(normalizeLocaleParam("ru-RU")).toBe("ru");
    expect(normalizeLocaleParam("de")).toBeNull();
    expect(normalizeLocaleParam("")).toBeNull();
    expect(normalizeLocaleParam(null)).toBeNull();
    expect(normalizeLocaleParam("ru;q=0.9")).toBeNull(); // 호출부가 항목을 잘라서 넘긴다
  });
});

describe("withLang — 주소에 ?lang= 붙이기", () => {
  it("물음표가 없으면 ?, 있으면 &, 해시는 뒤에 유지", () => {
    expect(withLang("https://healwith.co.kr/claim/abc", "ru")).toBe("https://healwith.co.kr/claim/abc?lang=ru");
    expect(withLang("https://healwith.co.kr/consultation/9?invite=x", "kk")).toBe("https://healwith.co.kr/consultation/9?invite=x&lang=kz");
    expect(withLang("https://healwith.co.kr/claim/abc#top", "zh")).toBe("https://healwith.co.kr/claim/abc?lang=zh#top");
  });
  it("언어를 모르면 주소를 그대로 — 잘못된 값을 붙이느니 안 붙인다", () => {
    expect(withLang("https://healwith.co.kr/claim/abc", null)).toBe("https://healwith.co.kr/claim/abc");
    expect(withLang("https://healwith.co.kr/claim/abc", "xx")).toBe("https://healwith.co.kr/claim/abc");
  });
});

describe("pickGuestLocale — 쿠키 → ?lang → Accept-Language → en", () => {
  it("봇(쿠키·헤더 없음)은 ?lang 으로 제 언어 카드를 받는다 — 2026-08-31 실측의 구멍", () => {
    expect(pickGuestLocale({ langParam: "ru" })).toBe("ru");
    expect(pickGuestLocale({ langParam: "kk" })).toBe("kz");
  });
  it("본인이 고른 쿠키가 ?lang 보다 앞선다(한국인 코디가 환자 링크를 눌러도 코디 화면은 그대로)", () => {
    expect(pickGuestLocale({ cookie: "ko", langParam: "ru", acceptLanguage: "ru-RU,ru;q=0.9" })).toBe("ko");
  });
  it("?lang 이 Accept-Language 보다 앞선다(러시아어 브라우저를 쓰는 카자흐 환자)", () => {
    expect(pickGuestLocale({ langParam: "kz", acceptLanguage: "ru-RU,ru;q=0.9" })).toBe("kz");
  });
  it("?lang 이 이상하면 무시하고 다음 칸으로", () => {
    expect(pickGuestLocale({ langParam: "de", acceptLanguage: "kk-KZ,kk;q=0.9" })).toBe("kz");
    expect(pickGuestLocale({ langParam: "de" })).toBe("en");
  });
  it("쿠키가 이상값이면 무시한다", () => {
    expect(pickGuestLocale({ cookie: "xx", acceptLanguage: "ja" })).toBe("ja");
  });
});

describe("resolveGuestLocale — 어디서 왔는지도 알려준다(쿠키 심는 기간이 갈린다)", () => {
  it("source", () => {
    expect(resolveGuestLocale({ cookie: "ko", langParam: "ru" }).source).toBe("cookie");
    expect(resolveGuestLocale({ langParam: "ru" }).source).toBe("param");
    expect(resolveGuestLocale({ acceptLanguage: "ru" }).source).toBe("header");
    expect(resolveGuestLocale({}).source).toBe("default");
  });
});

describe("Accept-Language — 첫 항목만 보지 않는다 (2026-09-06)", () => {
  it("⭐ 우크라이나어 다음 러시아어면 러시아어 — 영어로 떨어지던 것", () => {
    expect(pickGuestLocale({ acceptLanguage: "uk-UA,uk;q=0.9,ru;q=0.5" })).toBe("ru");
  });
  it("우즈벡·키르기스 브라우저: 둘째가 카자흐어면 카자흐어, 러시아어면 러시아어", () => {
    expect(pickGuestLocale({ acceptLanguage: "uz,kk;q=0.8,ru;q=0.6" })).toBe("kz");
    expect(pickGuestLocale({ acceptLanguage: "ky-KG,ru;q=0.8" })).toBe("ru");
  });
  it("q 값이 적힌 순서보다 앞선다", () => {
    expect(pickGuestLocale({ acceptLanguage: "ru;q=0.4,ja;q=0.9" })).toBe("ja");
    expect(acceptLanguageCandidates("ru;q=0.4,ja;q=0.9,en")).toEqual(["en", "ja", "ru"]);
  });
  it("q=0 은 거부라 건너뛴다 · 빈 값은 en", () => {
    expect(pickGuestLocale({ acceptLanguage: "ru;q=0,ja;q=0.5" })).toBe("ja");
    expect(pickGuestLocale({ acceptLanguage: "" })).toBe("en");
    expect(acceptLanguageCandidates(null)).toEqual([]);
  });
  it("우리가 없는 언어만 있으면 en (독일어 브라우저)", () => {
    expect(pickGuestLocale({ acceptLanguage: "de-DE,de;q=0.9,fr;q=0.8" })).toBe("en");
  });
});
