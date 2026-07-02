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
    await page.locator('input[aria-label="Password"]').fill("Test1234");
    await page.locator('input[aria-label="Confirm password"]').fill("Test1234");
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
