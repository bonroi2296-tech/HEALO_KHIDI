/**
 * 계약 검사 — 열쇠 링크가 측정 도구로 새어 나가지 않는다 (maskSecretPath)
 *
 * 왜: /survey/<토큰> · /claim/<토큰> · /opinion/<토큰> · /c/<코드> 는 로그인 없이 열리는
 *   링크이고, 그 토큰 자체가 인증 수단이다. 주소를 아는 사람은 누구나 그 환자의 설문·소견서·
 *   상담방에 들어간다. 그런데 GA4 page_location 과 버셀 웹 애널리틱스 path 에 전체 주소가
 *   그대로 실려 나가고 있었다(2026-07-31 발견) — 개인정보 이전에 **접근권한 유출**이다.
 *   이 검사가 그 유출의 부활을 커밋 전에 잡는다.
 */

import { describe, it, expect } from "vitest";
import { maskSecretPath } from "./ga";

describe("maskSecretPath — 열쇠는 가리고 측정 쓸모는 남긴다", () => {
  it("설문·클레임·소견서·짧은상담 링크의 토큰을 가린다", () => {
    const cases = [
      ["https://healwith.co.kr/survey/AbC123xyz", "https://healwith.co.kr/survey/[token]"],
      ["https://healwith.co.kr/claim/tok_9f8e7d", "https://healwith.co.kr/claim/[token]"],
      ["https://healwith.co.kr/opinion/QWERTY0987", "https://healwith.co.kr/opinion/[token]"],
      ["https://healwith.co.kr/c/32byte-code-here", "https://healwith.co.kr/c/[token]"],
      ["/survey/abc", "/survey/[token]"],
    ];
    for (const [input, expected] of cases) {
      expect(maskSecretPath(input)).toBe(expected);
    }
  });

  it("언어 접두사가 붙어도 가린다", () => {
    expect(maskSecretPath("https://healwith.co.kr/ru/survey/SeCrEt")).toBe(
      "https://healwith.co.kr/ru/survey/[token]"
    );
  });

  it("주소 뒤 물음표에 실린 토큰도 가린다", () => {
    expect(maskSecretPath("https://healwith.co.kr/reset-password?token=abc123&lang=ru")).toBe(
      "https://healwith.co.kr/reset-password?token=[redacted]&lang=ru"
    );
    expect(maskSecretPath("/x?code=zzz")).toBe("/x?code=[redacted]");
  });

  it("평범한 주소는 한 글자도 안 건드린다 (측정 쓸모 보존)", () => {
    const keep = [
      "https://healwith.co.kr/ko",
      "https://healwith.co.kr/hospitals/severance",
      "https://healwith.co.kr/treatments/immunotherapy",
      "https://healwith.co.kr/contact",
      "https://healwith.co.kr/care-journey",
      "https://healwith.co.kr/ru/for-russian-patients?utm_source=yandex",
    ];
    for (const u of keep) expect(maskSecretPath(u)).toBe(u);
  });

  it("빈 값·이상한 입력에도 안 터진다", () => {
    expect(maskSecretPath("")).toBe("");
    expect(maskSecretPath(undefined as any)).toBe(undefined);
  });
});
