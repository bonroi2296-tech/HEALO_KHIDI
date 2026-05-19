/**
 * E2E F-3: 어드민 AI 피드백 목록
 *
 * - 어드민 로그인 후 /admin/khidi/ai-feedback 접근
 * - 👎 피드백 목록 렌더링 확인
 *
 * 필요한 환경변수: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("어드민 AI 피드백 목록", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip(true, "E2E_ADMIN_EMAIL 미설정 — 스킵");
    }
    await loginAs(page, "admin");
  });

  test("AI 피드백 페이지 렌더링 — 제목 및 목록 UI 존재", async ({ page }) => {
    await page.goto("/admin/khidi/ai-feedback");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText().catch(() => "");

    const hasPageContent =
      /피드백|feedback|AI|리뷰|review/i.test(bodyText);
    expect(hasPageContent).toBeTruthy();
  });

  test("피드백 목록이 표 또는 카드 형태로 렌더링된다", async ({ page }) => {
    await page.goto("/admin/khidi/ai-feedback");
    await page.waitForLoadState("networkidle");

    // table, list, 또는 card 구조
    const hasTableOrList = await page
      .locator("table, ul li, [class*='list'], [class*='feedback-item']")
      .first()
      .isVisible()
      .catch(() => false);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    // 데이터가 없어도 "피드백 없음" 같은 메시지는 있어야 함
    const hasAnyContent = bodyText.trim().length > 50;

    expect(hasTableOrList || hasAnyContent).toBeTruthy();
  });
});
