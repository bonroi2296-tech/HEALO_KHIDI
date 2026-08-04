/**
 * E2E: 가입 중복 이메일 분기 (POSTMORTEMS #36 회귀 가드)
 *
 * 버그였던 것: 이미 가입된 이메일로 가입해도 신규와 똑같이 "인증 메일 보냈어요"를
 * 띄워, 사용자가 오지 않는 메일을 기다렸음. 빌드·404로는 절대 안 잡히는 분기 버그.
 *
 * 이 스펙은 "실제 여정"을 돌려 그 분기를 직접 검증한다:
 *   이미 존재하는 이메일(patient@test.com)로 가입 → "이미 가입된 이메일" 화면이 떠야 하고,
 *   거짓 "메일 보냈어요/확인" 문구가 뜨면 안 된다.
 *
 * 로그인 secrets 불필요(공개 /signup + Supabase signUp 호출뿐). 새 유저를 만들지 않는
 * 분기만 검증하므로 prod 데이터·메일 쿼터를 오염시키지 않는다.
 */

import { test, expect } from "@playwright/test";

const EXISTING_EMAIL = "patient@test.com"; // 시드 계정(항상 존재)

/**
 * ⚠️ **흔한 비밀번호를 쓰지 마라 — 이 스펙이 6일간 빨강이던 진짜 이유였다.**
 *
 * 예전 값은 `Test1234!` 였는데, Supabase 의 「유출된 비밀번호 차단」이 2026-07-28~29 사이
 * 켜지면서 서버가 그 값을 **422 `weak_password`** 로 되돌리기 시작했다. 그러면 화면이
 * 「가입에 실패했습니다」에서 멈춰 **중복 이메일 분기까지 가보지도 못한다** — 즉 이 스펙은
 * 「중복 안내가 깨졌다」가 아니라 「비밀번호가 거부됐다」로 빨강이었다(실서비스는 멀쩡했다.
 * 2026-08-04 실측: 센 비밀번호로 같은 요청을 보내면 `identities: []` 가 정상 반환된다).
 *
 * 그러니 여기 값은 **우리 정책(8자+영문+특수문자)을 만족하면서 유출 목록에 없는** 것이어야 한다.
 * 「읽기 쉽게」 바꾸고 싶어도 사전에 있을 법한 단어(test·password·1234…)로 되돌리지 마라.
 * 계정이 새로 생길 걱정은 없다 — 위 이메일은 이미 존재하는 시드 계정이라 가입이 아니라
 * 「이미 가입됨」 분기로만 간다.
 */
const THROWAWAY_PASSWORD = "Qz7#vLp2Rm9xTk4";

// @smoke 승격: 가입 UI 를 바꾼 PR 이 이 스펙을 안 깨뜨리는지 "머지 전"에 잡는다
// (main 전용이던 탓에 6일 빨강을 아무도 못 느꼈던 재발 방지 — 2026-07-02).
test.describe("가입 — 중복 이메일 정직 안내 @smoke", () => {
  test("이미 가입된 이메일은 '메일 보냈어요'가 아니라 '이미 가입됨'으로 안내한다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('input[placeholder="John"]').fill("Test");
    await page.locator('input[placeholder="Doe"]').fill("User");
    await page.locator('input[aria-label="Email"]').fill(EXISTING_EMAIL);
    // 생년월일 필수(#405 아이디 찾기 본인확인) — 스펙이 안 채워 "필수 항목" 토스트로 막혔던 두 번째 드리프트
    await page.locator("#signup-birthdate").fill("1990-01-01");
    // 비번 정책 = 8자+영문+특수문자(validatePassword) — 특수문자 없던 옛 값이면 세 번째 드리프트로 막힘
    await page.locator('input[aria-label="Password"]').fill(THROWAWAY_PASSWORD);
    await page.locator('input[aria-label="Confirm password"]').fill(THROWAWAY_PASSWORD);
    // PR #358(2026-06-25)에서 동의가 #terms 1개 → 개인정보(#agree-privacy)·약관(#agree-terms) 2개로
    // 분리됐는데 이 스펙이 안 따라가 main E2E 가 6일간 전 실행 빨강이었음(2026-07-02 전수 감사).
    await page.locator("#agree-privacy").check();
    await page.locator("#agree-terms").check();

    // 본문 제출 버튼만(헤더·구글 버튼 제외). DOM상 제출이 구글보다 먼저라 .first().
    await page
      .locator("#main-content")
      .getByRole("button", { name: /^sign up$|^가입|регист|тірк|注册|登録/i })
      .first()
      .click();

    // "이미 가입된 이메일" 안내가 떠야 한다 (ko 기준; 다른 언어도 통과하게 정규식)
    await expect(
      page.getByText(/이미 가입된|already registered|уже зарегистр|тіркелген|已注册|登録済み/i)
    ).toBeVisible({ timeout: 15000 });

    // 거짓 "인증 메일 보냈어요/확인" 문구가 보이면 안 된다 (회귀 시 실패)
    await expect(
      page.getByText(/인증 메일을 보냈어요|메일을 확인해주세요/)
    ).toHaveCount(0);
  });
});
