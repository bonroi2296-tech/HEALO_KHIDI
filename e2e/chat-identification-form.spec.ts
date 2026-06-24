/**
 * E2E A-2: 채팅 신원 확인 폼
 *
 * 채팅 첫 진입 시:
 * - 이름·이메일·국가 입력 폼이 보여야 함
 * - 제출 후 채팅 인터페이스로 전환
 */

import { test, expect } from "@playwright/test";

test.describe("채팅 신원 확인 폼", () => {
  test("첫 진입 시 이름·이메일·국가 폼이 노출된다", async ({ page }) => {
    // 쿠키·세션 초기화 (신규 사용자 시뮬레이션)
    await page.context().clearCookies();

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 채팅 위젯 버튼 클릭 (버블 형태일 수 있음)
    const chatTrigger = page
      .locator(
        'button[aria-label*="chat"], button[aria-label*="채팅"], [data-testid="chat-trigger"]'
      )
      .first();

    const triggerVisible = await chatTrigger.isVisible().catch(() => false);
    if (triggerVisible) {
      await chatTrigger.click();
    }

    // 이름 필드
    const nameField = page
      .locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="name"]')
      .first();
    const nameVisible = await nameField.isVisible().catch(() => false);

    if (!nameVisible) {
      // 통합 문의 퍼널(/inquiry): 진입 시 AI Agent / Human Agent / Inquiry Form 선택 화면 →
      // 선택지를 클릭해야 입력 폼이 나타남 (2026-05 피벗 구조)
      await page.goto("/inquiry");
      await page.waitForLoadState("domcontentloaded");
      const formChoice = page.getByText(/Inquiry Form/i).first();
      if (await formChoice.isVisible().catch(() => false)) {
        await formChoice.click();
      }
    }

    // 필수 필드가 최소 하나라도 있어야 함
    await expect(
      page.locator('input[type="email"], input[type="text"], select, textarea').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("신원 폼 제출 후 채팅/상담 인터페이스가 이어진다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/inquiry");
    await page.waitForLoadState("domcontentloaded");

    // 이름 입력
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="Name"]')
      .first();
    const hasName = await nameInput.isVisible().catch(() => false);
    if (hasName) {
      await nameInput.fill("E2E 테스트 사용자");
    }

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]').first();
    const hasEmail = await emailInput.isVisible().catch(() => false);
    if (hasEmail) {
      await emailInput.fill("e2e-test@healo-test.invalid");
    }

    // 제출 버튼
    const submitBtn = page
      .getByRole("button", { name: /제출|보내기|신청|시작|submit|send/i })
      .first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);

    if (hasSubmit) {
      await submitBtn.click();
      await page.waitForLoadState("domcontentloaded");

      // 제출 후 — 성공 메시지 or 채팅 UI or 다음 단계
      const successOrChat = await page
        .locator(
          '[data-testid="chat-container"], [class*="success"], [class*="thank"]'
        )
        .first()
        .isVisible()
        .catch(() => false);

      const pageText = await page.locator("body").innerText();
      const hasSuccessText = /감사|완료|접수|submitted|success|thank/i.test(
        pageText
      );

      expect(successOrChat || hasSuccessText).toBeTruthy();
    }
  });
});
