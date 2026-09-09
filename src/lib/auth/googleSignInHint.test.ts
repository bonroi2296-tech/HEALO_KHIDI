/**
 * 「구글로 로그인하세요」 안내를 보낼 것인가 — 2026-09-09 실사고 2건의 재발 검사.
 *
 * 사고 ①: `admin.auth.admin.listUsers()` 는 identities 를 «빈 배열»로 준다(getUserById 만 채운다).
 *   예전 판정은 빈 배열을 「email 수단이 없음 = 소셜 전용」으로 읽어 **모든 사용자에게 true**
 *   를 돌려줬고, 비밀번호 찾기를 누른 사람은 누구나 이 안내만 받았다.
 *   = 비밀번호 재설정이 아무에게도 안 됐다.
 *
 * 사고 ②(독립 리뷰가 잡음): ①을 고치자 **애플 전용 계정**이 처음으로 이 분기에 정확히
 *   걸리기 시작했는데, 보내는 메일은 구글 문구뿐이라 «없는 길»을 가리켰다.
 *   애플 비공개 릴레이로 가입했다면 구글 로그인은 다른 계정을 새로 만들 뿐이다.
 *
 * 🛑 아래 세 줄(빈 목록 / email 있음 / 애플만)을 지우면 그 사고들이 그대로 돌아온다.
 */
import { describe, it, expect } from "vitest";
import { shouldSendGoogleSignInHint } from "@/lib/auth/googleSignInHint";

describe("shouldSendGoogleSignInHint", () => {
  it("판정 불가(빈 목록)면 안내를 보내지 않는다 — 일반 재설정 흐름으로 간다", () => {
    expect(shouldSendGoogleSignInHint([])).toBe(false);
    expect(shouldSendGoogleSignInHint(null)).toBe(false);
    expect(shouldSendGoogleSignInHint(undefined)).toBe(false);
  });

  it("email 수단이 있으면 비밀번호가 있는 계정이라 보내지 않는다", () => {
    expect(shouldSendGoogleSignInHint([{ provider: "email" }])).toBe(false);
    // 실측 사례: bonroi2296@gmail.com = email·apple·google 셋
    expect(
      shouldSendGoogleSignInHint([
        { provider: "email" },
        { provider: "apple" },
        { provider: "google" },
      ]),
    ).toBe(false);
  });

  it("🔴 애플만 있는 계정에는 보내지 않는다 — 구글 문구가 «없는 길»을 가리킨다", () => {
    expect(shouldSendGoogleSignInHint([{ provider: "apple" }])).toBe(false);
  });

  it("구글이 있는 소셜 전용 계정에만 보낸다", () => {
    expect(shouldSendGoogleSignInHint([{ provider: "google" }])).toBe(true);
    expect(shouldSendGoogleSignInHint([{ provider: "google" }, { provider: "apple" }])).toBe(true);
  });
});
