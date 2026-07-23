/**
 * 계약 테스트 — 왓츠앱 전화 국가번호 → 언어 추정
 *
 * 왓츠앱은 language_code 를 안 준다 — 첫 응대 언어가 여기서 갈리므로
 * 핵심 타겟(카자흐 +7 6xx/7xx vs 러시아 +7 9xx) 구분을 계약으로 잠근다.
 */

import { describe, it, expect } from "vitest";
import { mapWaLang } from "./waLang";

describe("mapWaLang — 국가번호 → 활성 언어", () => {
  it("+7 은 대역으로 카자흐/러시아를 가른다 (핵심 타겟 구분)", () => {
    expect(mapWaLang("77471234567")).toBe("kz"); // 카자흐 이동전화 +7 7xx
    expect(mapWaLang("76001234567")).toBe("kz"); // +7 6xx
    expect(mapWaLang("79161234567")).toBe("ru"); // 러시아 모바일 +7 9xx
  });

  it("한국 82 / 중국 86 / 일본 81", () => {
    expect(mapWaLang("821047721075")).toBe("ko");
    expect(mapWaLang("8613800000000")).toBe("zh");
    expect(mapWaLang("819012345678")).toBe("ja");
  });

  it("CIS 인접국(우즈벡 998·키르기스 996 등)은 러시아어 폴백", () => {
    expect(mapWaLang("998901234567")).toBe("ru");
    expect(mapWaLang("996700123456")).toBe("ru");
  });

  it("미지·빈 값은 en 폴백 (에러 없이)", () => {
    expect(mapWaLang("14155550100")).toBe("en"); // 미국
    expect(mapWaLang("")).toBe("en");
    expect(mapWaLang(undefined as any)).toBe("en");
  });
});
