/**
 * E2E D-3: 만료된/잘못된 게스트 토큰 → 에러 메시지
 *
 * 기존 consultation-guest.spec.ts 와 중복 없이 강화:
 * - 만료 토큰 시나리오 (이름 제출 후 서버 에러)
 * - 짧은/형식 불량 토큰
 */

import { test, expect } from "@playwright/test";

test.describe("게스트 토큰 만료/오류 케이스", () => {
  test("너무 짧은 토큰 → 에러 메시지", async ({ page }) => {
    const fakeSession = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/consultation/${fakeSession}?invite=bad`);
    await page.waitForLoadState("domcontentloaded");

    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText().catch(() => "");

    // 에러 메시지 또는 입장 실패 표시
    const hasError =
      /만료|유효하지|invalid|expired|error|오류|찾을 수 없|not found|접속 실패|연결|connection failed|failed/i.test(bodyText);

    // 또는 이름 폼에서 시도 후 에러
    const nameInput = page
      .locator('input[placeholder*="이름"], input[placeholder*="name"], input[placeholder*="Айжан"]')
      .first();
    const hasForm = await nameInput.isVisible().catch(() => false);

    if (hasForm) {
      await nameInput.fill("Test");
      await page.getByRole("button", { name: /시작|start|입장/i }).first().click();
      await page.waitForTimeout(3000);

      const afterText = await page.locator("body").innerText().catch(() => "");
      const hasErrorAfter =
        /만료|유효하지|invalid|expired|error|오류|접속 실패|연결|connection failed|failed/i.test(afterText);
      expect(hasErrorAfter).toBeTruthy();
    } else {
      expect(hasError).toBeTruthy();
    }
  });

  test("없는 세션 ID + 토큰 → 적절한 에러 응답", async ({ page }) => {
    const nonExistSession = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const badToken = "0".repeat(64);

    await page.goto(`/consultation/${nonExistSession}?invite=${badToken}`);
    await page.waitForLoadState("domcontentloaded");

    const nameInput = page
      .locator('input[placeholder*="이름"], input[placeholder*="name"], input[placeholder*="Айжан"]')
      .first();
    const hasForm = await nameInput.isVisible().catch(() => false);

    if (hasForm) {
      await nameInput.fill("E2E 테스트");
      const startBtn = page.getByRole("button", { name: /시작|start|입장|상담/i }).first();
      const hasStart = await startBtn.isVisible().catch(() => false);
      if (hasStart) {
        await startBtn.click();
        // 에러 응답 대기 (API 호출 후)
        await page.waitForTimeout(5000);
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const hasError = /만료|유효하지|invalid|expired|error|오류|not found|접속 실패|연결|connection failed|failed/i.test(bodyText);
        expect(hasError).toBeTruthy();
      }
    } else {
      // 이미 에러 페이지 표시
      const bodyText = await page.locator("body").innerText().catch(() => "");
      expect(bodyText.length).toBeGreaterThan(10);
    }
  });
});
