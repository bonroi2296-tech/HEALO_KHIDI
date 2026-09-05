/**
 * E2E A-4: AI 응답 👎 피드백 흐름
 *
 * - AI 응답 밑의 👎 를 누르면 사유 고르는 칸이 뜨고, 보내면 감사 표시가 뜬다.
 *
 * ⚠️ 2026-08-25 고침: 예전엔 홈(/)에서 👎 와 채팅 입력창을 찾다 «못 찾으면 건너뜀»으로 빠졌다.
 *    ①홈엔 채팅이 없고 ②👎 의 이름표는 "Not helpful" 인데 검사는 'down'·'부정'을 찾고 있었다.
 *    두 가지가 겹쳐 이 검사는 한 번도 돈 적이 없다.
 */

import { test, expect } from "@playwright/test";
import { openPublicChat, sendAndWaitReply } from "./fixtures/publicChat";

test.describe("AI 응답 부정 피드백 흐름", () => {
  test("👎 → 사유 선택 → 보내기 → 감사 표시", async ({ page }) => {
    test.setTimeout(210_000);

    await openPublicChat(page);
    await sendAndWaitReply(page, "폐암 치료 병원 추천해줘");

    // 👎 는 인사 말풍선엔 안 붙고 «진짜 답변»에만 붙는다(intro/greet 제외 로직).
    const thumbsDown = page.locator('button[aria-label="Not helpful"]').last();
    await expect(thumbsDown, "AI 답변에 👎 단추가 없다").toBeVisible({ timeout: 30_000 });
    await thumbsDown.click();

    const modal = page.locator('[data-testid="chat-feedback-modal"]');
    await expect(modal, "👎 를 눌렀는데 사유 고르는 칸이 안 떴다").toBeVisible({ timeout: 10_000 });

    await modal.locator('[data-testid="chat-feedback-reason"]').first().click();

    // 판정은 «화면 글자»가 아니라 «서버가 받았는지»로 한다 — 감사 표시는 2초 뒤 사라지는
    // 토스트라 그걸 기다리면 검사가 타이밍에 흔들린다(2026-08-25 실제로 놓쳤다).
    // 피드백이 서버에 안 닿으면 AI 품질 지표가 조용히 0건이 된다 — 그게 진짜 검사할 것이다.
    const posted = page.waitForResponse(
      (r) => r.url().includes("/api/public/chat/feedback") && r.request().method() === "POST",
      { timeout: 20_000 }
    );
    await modal.locator('[data-testid="chat-feedback-submit"]').click();
    const res = await posted;
    expect(res.status(), "피드백이 서버에 접수되지 않았다").toBeLessThan(400);

    // 보내면 사유 고르는 칸은 닫힌다.
    await expect(modal).toBeHidden({ timeout: 15_000 });
  });
});
