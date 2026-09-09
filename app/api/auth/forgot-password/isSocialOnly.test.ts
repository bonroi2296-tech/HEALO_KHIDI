/**
 * 「소셜 전용 계정인가」 판정 — 2026-09-09 실사고의 재발 검사.
 *
 * 사고: `admin.auth.admin.listUsers()` 는 identities 를 «빈 배열»로 준다(getUserById 만 채운다).
 *   예전 판정은 빈 배열을 「email identity 가 없음 = 소셜 전용」으로 읽어 **모든 사용자에게 true**
 *   를 돌려줬고, 비밀번호 찾기를 누른 사람은 누구나 「비밀번호가 없습니다」 안내를 받았다.
 *   = 비밀번호 재설정이 아무에게도 안 됐다.
 *
 * 🛑 첫 줄(빈 목록 → false)을 지우면 그 사고가 그대로 돌아온다.
 */
import { describe, it, expect } from "vitest";
import { isSocialOnly } from "./route";

describe("isSocialOnly", () => {
  it("판정 불가(빈 목록)면 소셜 전용이 아니다 — 일반 재설정 흐름으로 보낸다", () => {
    expect(isSocialOnly([])).toBe(false);
    expect(isSocialOnly(null)).toBe(false);
    expect(isSocialOnly(undefined)).toBe(false);
  });

  it("email 수단이 있으면 비밀번호가 있는 계정이다", () => {
    expect(isSocialOnly([{ provider: "email" }])).toBe(false);
    // 실측 사례: bonroi2296@gmail.com = email·apple·google 셋
    expect(isSocialOnly([{ provider: "email" }, { provider: "apple" }, { provider: "google" }])).toBe(false);
  });

  it("소셜 수단만 있으면 소셜 전용이다", () => {
    expect(isSocialOnly([{ provider: "google" }])).toBe(true);
    expect(isSocialOnly([{ provider: "google" }, { provider: "apple" }])).toBe(true);
  });
});
