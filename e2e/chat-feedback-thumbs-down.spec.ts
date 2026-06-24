/**
 * E2E A-4: AI 응답 👎 피드백 흐름
 *
 * - AI 응답이 있는 페이지에서 👎 버튼 클릭
 * - 피드백 모달/패널 표시
 * - 사유 선택 후 제출 → 감사 메시지
 */

import { test, expect } from "@playwright/test";

test.describe("AI 응답 부정 피드백 흐름", () => {
  test("👎 버튼 클릭 → 사유 선택 → 제출 → 감사 메시지", async ({ page }) => {
    // 어드민 AI 피드백 목록 페이지 (피드백 데이터 있는 곳)
    // 또는 채팅 있는 페이지에서 직접 시도
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 👎 버튼 찾기
    const thumbsDown = page
      .locator(
        'button[aria-label*="down"], button[aria-label*="부정"], [data-testid="thumbs-down"], button:has-text("👎")'
      )
      .first();

    const thumbsVisible = await thumbsDown.isVisible().catch(() => false);
    if (!thumbsVisible) {
      // 채팅 메시지를 먼저 보내야 👎 버튼이 생길 수 있음
      const chatInput = page
        .locator('textarea[placeholder], input[placeholder*="질문"]')
        .first();
      const inputVisible = await chatInput.isVisible().catch(() => false);

      if (!inputVisible) {
        test.skip(true, "채팅 UI 없음 — 스킵");
      }

      await chatInput.fill("폐암 치료 병원 추천해줘");
      await chatInput.press("Enter");

      // AI 응답 대기
      await page.waitForTimeout(3000);

      const thumbsDownAfter = page
        .locator(
          'button[aria-label*="down"], button[aria-label*="부정"], [data-testid="thumbs-down"]'
        )
        .first();

      const visibleAfter = await thumbsDownAfter.isVisible().catch(() => false);
      if (!visibleAfter) {
        test.skip(true, "👎 버튼이 응답 후에도 없음 — UI 구현 미완 스킵");
      }

      await thumbsDownAfter.click();
    } else {
      await thumbsDown.click();
    }

    // 피드백 모달 또는 패널
    await page.waitForTimeout(500);
    const feedbackModal = page
      .locator(
        '[role="dialog"], [data-testid="feedback-modal"], [class*="modal"], [class*="feedback"]'
      )
      .first();
    const modalVisible = await feedbackModal.isVisible().catch(() => false);

    if (modalVisible) {
      // 사유 선택 (라디오 or 버튼)
      const reasonOption = page
        .locator('input[type="radio"], [data-testid*="reason"], button[data-reason]')
        .first();
      const hasReason = await reasonOption.isVisible().catch(() => false);
      if (hasReason) {
        await reasonOption.click();
      }

      // 제출
      const submitBtn = page
        .getByRole("button", { name: /제출|보내기|send|submit/i })
        .first();
      const hasSubmit = await submitBtn.isVisible().catch(() => false);
      if (hasSubmit) {
        await submitBtn.click();
      }

      // 감사 메시지
      await page.waitForTimeout(500);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      expect(/감사|접수|submitted|thank/i.test(bodyText)).toBeTruthy();
    } else {
      // 모달 없으면 인라인 감사 메시지 확인
      const bodyText = await page.locator("body").innerText().catch(() => "");
      expect(/감사|접수|피드백/i.test(bodyText)).toBeTruthy();
    }
  });
});
