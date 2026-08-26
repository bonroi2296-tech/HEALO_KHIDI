/**
 * E2E A-3: 채팅 대화 복구 (쿠키 기반)
 *
 * - 메시지 전송 후 같은 브라우저로 다시 들어오면 이전 대화가 살아 있어야 함
 *
 * ⚠️ 2026-08-25 고침: 예전엔 홈(/)에서 채팅 입력창을 찾다 «못 찾으면 건너뜀»으로 빠졌다.
 *    홈에는 입력 칸이 아예 없어 이 검사는 한 번도 돈 적이 없다.
 */

import { test, expect } from "@playwright/test";
import { openPublicChat } from "./fixtures/publicChat";

test.describe("채팅 대화 세션 복구", () => {
  test("다시 들어오면 이전 대화가 남아 있다", async ({ page, context }) => {
    test.setTimeout(150_000);

    const input = await openPublicChat(page);

    const testMessage = `E2E 복구 검사 ${Date.now()}`;
    // AI 답변은 기다리지 않는다 — 이 검사가 보는 건 «내가 보낸 말이 서버에 남는가»다.
    // 답변까지 기다리면 AI 가 느린 날 이 검사가 애꿎게 빨간불이 된다.
    const stored = page.waitForResponse(
      (r) => r.url().includes("/api/public/chat/") && r.request().method() === "POST",
      { timeout: 45_000 }
    );
    await input.fill(testMessage);
    await input.press("Enter");
    const res = await stored;
    expect(res.status(), "보낸 말이 서버에서 거절됐다").toBeLessThan(400);
    await expect(page.locator('[data-testid="chat-msg-user"]').last()).toContainText(
      testMessage,
      { timeout: 30_000 }
    );

    // 대화 쿠키가 실제로 심겼는지 — 복구는 이 쿠키에 기대고 있다.
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) =>
      /session|chat|thread|healo|healwith/i.test(c.name)
    );
    expect(sessionCookie, `대화 쿠키가 없다: ${cookies.map((c) => c.name).join(",")}`).toBeTruthy();

    // 같은 브라우저(쿠키 공유)로 다시 들어오면 방금 보낸 말이 남아 있어야 한다.
    const page2 = await context.newPage();
    await page2.goto("/ko/inquiry");
    await page2.waitForLoadState("domcontentloaded");
    await page2.locator('[data-testid="channel-ai"]').click();

    await expect(page2.locator("body")).toContainText(testMessage, { timeout: 30_000 });

    await page2.close();
  });
});
