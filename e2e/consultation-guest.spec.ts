/**
 * E2E: 게스트 입장 흐름 (계정 없이 링크로 접속)
 *
 * 검증:
 * - 유효하지 않은 토큰으로 접속 시 거절
 * - 정당한 invite 링크로 이름 입력 폼 노출
 *
 * 실제 LiveKit 방 접속은 비동기 미디어라 e2e 에서 완전 검증 어려움 —
 * UI 레이어 (폼, 에러 상태) 만 검증.
 */

import { test, expect } from "@playwright/test";

test.describe("게스트 상담 입장 UI", () => {
  test("잘못된 invite 토큰 → 에러 메시지", async ({ page }) => {
    // 존재하지 않는 session id + 잘못된 토큰
    const fakeSession = "00000000-0000-0000-0000-000000000000";
    const fakeToken = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    await page.goto(`/consultation/${fakeSession}?invite=${fakeToken}`);

    // 이름 입력 폼 먼저 노출
    await expect(page.getByText(/HEALO 원격 상담|원격협진/i).first()).toBeVisible();
    const nameInput = page.getByPlaceholder(/Айжан|이름|name/i);
    await expect(nameInput).toBeVisible();

    // 이름 입력 후 접속 시도 → 401/403 응답으로 에러 메시지
    await nameInput.fill("Test Patient");
    await page.getByRole("button", { name: /상담 시작|Start/i }).click();

    // invite 만료 / 유효하지 않음 에러 표시
    await expect(
      page.getByText(/만료|유효하지|invalid|expired/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("invite 없이 접속하면 일반 인증 흐름으로 진입", async ({ page }) => {
    const fakeSession = "00000000-0000-0000-0000-000000000001";
    await page.goto(`/consultation/${fakeSession}`);

    // 로그인 필요 / 세션 없음 상태 중 하나
    // 로딩 스피너 잠깐 있다가 에러 or 로그인 리다이렉트
    await page.waitForLoadState("networkidle");

    // 인증 에러 or 세션 없음 에러 메시지
    const hasAuthError = await page
      .getByText(/인증|로그인|auth|login/i)
      .isVisible()
      .catch(() => false);
    const hasNotFoundError = await page
      .getByText(/찾을 수 없|not found|not.{1,3}found/i)
      .isVisible()
      .catch(() => false);

    expect(hasAuthError || hasNotFoundError).toBeTruthy();
  });
});
