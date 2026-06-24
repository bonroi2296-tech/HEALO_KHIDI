/**
 * E2E B-2: 인테이크 폼 필수 필드 유효성 검사
 *
 * - 필수 필드를 비운 채 제출 시도
 * - 에러 메시지 또는 HTML5 validation 이 표시되어야 함
 */

import { test, expect } from "@playwright/test";

test.describe("인테이크 폼 필수 필드 검증", () => {
  test("빈 폼 제출 시 에러가 발생한다", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("domcontentloaded");

    const submitBtn = page
      .getByRole("button", { name: /제출|신청|보내기|submit|send/i })
      .first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);

    if (!hasSubmit) {
      test.skip(true, "제출 버튼 없음");
    }

    // 빈 채로 제출
    await submitBtn.click();
    await page.waitForTimeout(500);

    // HTML5 validation 또는 커스텀 에러 메시지
    const hasValidationError =
      await page.evaluate(() => {
        // HTML5 invalid pseudo-class
        const invalidInputs = document.querySelectorAll(":invalid");
        return invalidInputs.length > 0;
      });

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasCustomError = /필수|required|입력해|오류|error/i.test(bodyText);

    // URL이 그대로 인테이크여야 함 (완료 페이지로 가면 안 됨)
    expect(page.url()).toMatch(/intake/);
    expect(hasValidationError || hasCustomError).toBeTruthy();
  });

  test("이메일 형식이 틀리면 에러가 발생한다", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator('input[type="email"]').first();
    const hasEmail = await emailInput.isVisible().catch(() => false);
    if (!hasEmail) {
      test.skip(true, "이메일 입력 없음");
    }

    await emailInput.fill("invalid-not-an-email");

    const submitBtn = page
      .getByRole("button", { name: /제출|신청|보내기|submit|send/i })
      .first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);
    if (!hasSubmit) {
      test.skip(true, "제출 버튼 없음");
    }

    await submitBtn.click();
    await page.waitForTimeout(300);

    // 잘못된 이메일로는 완료 페이지로 가면 안 됨
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const wentToComplete = /감사|완료|thank you/i.test(bodyText);
    expect(wentToComplete).toBeFalsy();
  });
});
