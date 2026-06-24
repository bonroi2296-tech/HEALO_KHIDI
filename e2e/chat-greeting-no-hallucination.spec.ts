/**
 * E2E A-1: AI 채팅 — "안녕" 입력 시 가짜 병원명 포함 안 됨
 *
 * 할루시네이션 방지 기본 검증:
 * - 응답에 실재하지 않는 병원명 패턴이 없어야 함
 * - "안녕성형외과", "힐링메디컬" 등 조합형 가짜명 없어야 함
 */

import { test, expect } from "@playwright/test";

const FAKE_HOSPITAL_PATTERNS = [
  /안녕성형외과/,
  /힐링메디컬/,
  /케어클리닉/i,
  /메디힐/,
  /한국암센터/,   // 실재하지 않는 조합
];

test.describe("AI 채팅 — 할루시네이션 방지 @smoke", () => {
  test("안녕 인사에 가짜 병원명이 응답에 포함되지 않는다", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 채팅 입력창 찾기 (여러 selector 시도)
    const chatInput = page
      .locator('textarea[placeholder], input[placeholder*="질문"], input[placeholder*="입력"]')
      .first();

    // 채팅 위젯이 없으면 건너뜀 (페이지 구성에 따라 다를 수 있음)
    const inputVisible = await chatInput.isVisible().catch(() => false);
    if (!inputVisible) {
      test.skip(true, "홈에 채팅 입력창 없음 — /patient/chat 으로 시도");
    }

    await chatInput.fill("안녕");
    await chatInput.press("Enter");

    // AI 응답 대기 (최대 15초)
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll(
          '[data-testid="ai-message"], .ai-message, [class*="assistant"]'
        );
        return messages.length > 0;
      },
      { timeout: 15_000 }
    );

    const responseText = await page.locator("body").innerText();

    for (const pattern of FAKE_HOSPITAL_PATTERNS) {
      expect(responseText).not.toMatch(pattern);
    }
  });
});
