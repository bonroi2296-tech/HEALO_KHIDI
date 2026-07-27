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

    // 게스트 폼은 하이드레이션 뒤에 뜬다 — 「한 번 읽고 판정」 금지(POSTMORTEMS #132).
    const nameInput = page
      .locator('input[placeholder*="이름"], input[placeholder*="name"], input[placeholder*="Айжан"]')
      .first();
    await expect(nameInput).toBeVisible({ timeout: 15_000 });

    await nameInput.fill("Test");
    await page.getByRole("button", { name: /시작|start|입장/i }).first().click();

    // 서버가 토큰을 거절하면 에러 문구가 뜬다. 고정 3초 대기(→ 느린 날엔 헛발) 대신
    // 자동 재시도 어서션으로. 「연결」 단독은 "연결 중…"에도 걸려 거짓통과라 뺐다.
    await expect(page.locator("body")).toContainText(
      /만료|유효하지|invalid|expired|error|오류|접속 실패|연결 실패|connection failed|failed/i,
      { timeout: 15_000 }
    );
  });

  test("없는 세션 ID + 토큰 → 적절한 에러 응답", async ({ page }) => {
    const nonExistSession = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const badToken = "0".repeat(64);

    await page.goto(`/consultation/${nonExistSession}?invite=${badToken}`);

    // 예전엔 if(폼 있으면)/else(대충 글자 길이만) 로 갈라져 있었다 — else 쪽은 무엇을
    // 그리든 통과하는 «못 떨어지는 테스트»였다. 폼은 반드시 뜨는 게 정상 동작이므로
    // 조건 분기를 없애고 그것부터 단언한다(POSTMORTEMS #132).
    const nameInput = page
      .locator('input[placeholder*="이름"], input[placeholder*="name"], input[placeholder*="Айжан"]')
      .first();
    await expect(nameInput).toBeVisible({ timeout: 15_000 });

    await nameInput.fill("E2E 테스트");
    await page.getByRole("button", { name: /시작|start|입장|상담/i }).first().click();

    await expect(page.locator("body")).toContainText(
      /만료|유효하지|invalid|expired|error|오류|not found|접속 실패|연결 실패|connection failed|failed/i,
      { timeout: 15_000 }
    );
  });
});
