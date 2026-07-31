/**
 * 짧은 초대 주소(`/c/<코드>`)로 바꾸면서 코드 길이를 64자 → 32자로 줄였다.
 * 검증부의 최소길이 가드(32)보다 짧아지면 **모든 초대 링크가 한 번에 죽는다** — 그걸 막는 회귀 테스트.
 */

import { describe, it, expect } from "vitest";
import {
  newInviteCode,
  hashGuestToken,
  INVITE_CODE_RE,
  MIN_TOKEN_CHARS,
} from "./guestToken";

describe("초대 코드", () => {
  it("발급 코드는 검증부 최소길이 이상이다 (이게 깨지면 링크 전멸)", () => {
    expect(newInviteCode().length).toBeGreaterThanOrEqual(MIN_TOKEN_CHARS);
  });

  it("발급 코드는 짧은 주소가 받아주는 모양이다", () => {
    for (let i = 0; i < 20; i++) expect(newInviteCode()).toMatch(INVITE_CODE_RE);
  });

  it("예전에 나간 64자 코드도 짧은 주소로 들어올 수 있다", () => {
    expect("a".repeat(64)).toMatch(INVITE_CODE_RE);
  });

  it("모양이 아닌 것은 거른다 (경로 조작·빈값·대문자)", () => {
    for (const bad of ["", "bad", "../admin", "A".repeat(32), "f".repeat(65), "f".repeat(31)]) {
      expect(bad).not.toMatch(INVITE_CODE_RE);
    }
  });

  it("같은 코드는 같은 해시, 다른 코드는 다른 해시 (조회 키가 안정적이어야 넘김이 된다)", () => {
    const a = newInviteCode();
    expect(hashGuestToken(a)).toBe(hashGuestToken(a));
    expect(hashGuestToken(a)).not.toBe(hashGuestToken(newInviteCode()));
  });
});
