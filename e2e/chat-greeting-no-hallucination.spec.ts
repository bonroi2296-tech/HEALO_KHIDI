/**
 * E2E A-1: 공개 AI 상담 — "안녕" 입력 시 가짜 병원명 포함 안 됨
 *
 * 할루시네이션 방지 기본 검증:
 * - 응답에 실재하지 않는 병원명 패턴이 없어야 함
 *
 * ⚠️ 2026-08-25 고침: 예전엔 홈(/)에서 채팅 입력창을 찾다 «못 찾으면 건너뜀»으로 빠졌다.
 *    홈에는 입력 칸이 아예 없어서(실측: input·textarea 0개) 이 검사는 한 번도 돈 적이 없다.
 *    진짜 자리는 /inquiry → 「AI 상담」이다(fixtures/publicChat.ts).
 */

import { test, expect } from "@playwright/test";
import { openPublicChat, sendAndWaitReply } from "./fixtures/publicChat";

const FAKE_HOSPITAL_PATTERNS = [
  /안녕성형외과/,
  /힐링메디컬/,
  /케어클리닉/i,
  /메디힐/,
  /한국암센터/,   // 실재하지 않는 조합
];

test.describe("AI 채팅 — 할루시네이션 방지 @smoke", () => {
  test("안녕 인사에 가짜 병원명이 응답에 포함되지 않는다", async ({ page }) => {
    test.setTimeout(180_000);

    await openPublicChat(page);
    await sendAndWaitReply(page, "안녕");

    const responseText = await page.locator("body").innerText();

    for (const pattern of FAKE_HOSPITAL_PATTERNS) {
      expect(responseText).not.toMatch(pattern);
    }
  });
});
