// 채팅 경유 문의의 유입처를 「호스트만」 남기는 부분.
// 여기가 틀리면 ①검색어가 붙은 주소를 통째로 저장하거나(개인정보) ②우리 도메인이
// 유입처로 잡혀 집계가 부풀려진다 — 둘 다 화면상 멀쩡해 보여서 눈으로는 못 잡는다.
import { describe, it, expect } from "vitest";
import { hostOf } from "./publicChatHelpers";

describe("hostOf", () => {
  it("바깥 유입은 호스트만 남긴다 — 검색어가 붙은 주소도 뒤를 버린다", () => {
    expect(hostOf("https://yandex.ru/search/?text=лечение%20рака")).toBe("yandex.ru");
    expect(hostOf("https://www.google.kz/url?q=x&sa=t")).toBe("www.google.kz");
  });

  it("우리 도메인은 유입이 아니다(내부 이동)", () => {
    expect(hostOf("https://healwith.co.kr/ru/faq")).toBeNull();
    expect(hostOf("https://www.healwith.co.kr/inquiry")).toBeNull();
  });

  it("값이 없거나 주소가 아니면 조용히 비운다(접수를 막지 않는다)", () => {
    for (const v of [null, undefined, "", "  ", "direct", 42, {}]) {
      expect(hostOf(v)).toBeNull();
    }
  });

  it("호스트가 아주 길어도 컬럼 상한(120자)을 넘기지 않는다", () => {
    const long = `https://${"a".repeat(300)}.com/`;
    expect((hostOf(long) || "").length).toBeLessThanOrEqual(120);
  });
});
