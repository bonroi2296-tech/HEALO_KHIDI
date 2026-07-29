/**
 * «내 말이 나갈 언어» 고르기 가드.
 *
 * 2026-07-29 자가감사: 예전 규칙은 «맨 먼저 발견되는 다른 언어»였다. 2:1 통화에선 맞지만
 * 3명 이상이면 참가자 목록 순서에 따라 **아무 때나 뒤바뀐다**. 그날 회의에도 러시아어와
 * 영어가 섞여 있었다(ru 299줄 · en 70줄).
 */
import { describe, it, expect } from "vitest";
import { pickPartnerLang } from "./PartnerLangBridge";

describe("pickPartnerLang", () => {
  it("가장 많은 사람이 쓰는 언어를 고른다", () => {
    expect(pickPartnerLang(new Map([["en", 1], ["ru", 2]]))).toBe("ru");
  });

  it("순서가 바뀌어도 같은 답 — 화면마다 언어가 어긋나면 안 된다", () => {
    expect(pickPartnerLang(new Map([["ru", 2], ["en", 1]]))).toBe("ru");
  });

  it("동수면 언어 코드 사전순으로 고정 (모든 기기가 같은 답)", () => {
    expect(pickPartnerLang(new Map([["ru", 1], ["en", 1]]))).toBe("en");
    expect(pickPartnerLang(new Map([["en", 1], ["ru", 1]]))).toBe("en");
  });

  it("후보가 없으면 바꾸지 않는다(null) — 상대 입장 전엔 기존 설정 유지", () => {
    expect(pickPartnerLang(new Map())).toBe(null);
  });
});
