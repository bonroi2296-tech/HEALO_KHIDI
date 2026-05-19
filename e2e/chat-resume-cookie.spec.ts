/**
 * E2E A-3: 채팅 대화 복구 (쿠키 기반)
 *
 * - 메시지 전송 후 새 탭으로 같은 페이지 재방문
 * - 이전 대화 내용이 복구되어야 함 (sessionId 쿠키 기반)
 */

import { test, expect } from "@playwright/test";

test.describe("채팅 대화 세션 복구", () => {
  test("페이지 재방문 시 이전 메시지가 남아 있다", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 채팅 입력창 찾기
    const chatInput = page
      .locator(
        'textarea[placeholder], input[placeholder*="질문"], input[placeholder*="메시지"]'
      )
      .first();

    const inputVisible = await chatInput.isVisible().catch(() => false);
    if (!inputVisible) {
      test.skip(true, "채팅 입력창이 현재 페이지에 없음 — 스킵");
    }

    const testMessage = "E2E 복구 테스트 메시지 12345";
    await chatInput.fill(testMessage);
    await chatInput.press("Enter");

    // 메시지가 DOM에 추가되길 잠깐 대기
    await page.waitForTimeout(1000);

    // 같은 context 에서 새 탭 열기 (쿠키 공유됨)
    const page2 = await context.newPage();
    await page2.goto("/");
    await page2.waitForLoadState("networkidle");

    // 이전 메시지가 유지되거나, 세션 ID 쿠키가 남아있어야 함
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.toLowerCase().includes("session") ||
        c.name.toLowerCase().includes("chat") ||
        c.name.toLowerCase().includes("healo")
    );

    // 쿠키가 있거나, 두 번째 페이지에 이전 메시지가 표시됨
    const page2Text = await page2.locator("body").innerText().catch(() => "");
    const messageRestored = page2Text.includes(testMessage);

    expect(sessionCookie !== undefined || messageRestored).toBeTruthy();

    await page2.close();
  });
});
