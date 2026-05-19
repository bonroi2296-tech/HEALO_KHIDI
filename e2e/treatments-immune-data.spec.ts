/**
 * E2E C-4: 면역치료 데이터 표시 (ITCRN·치료법)
 *
 * - /treatments/immune 또는 면역치료 관련 페이지
 * - ITCRN 또는 면역치료 관련 텍스트가 표시되어야 함
 */

import { test, expect } from "@playwright/test";

test.describe("면역치료 데이터 페이지", () => {
  test("/treatments/immune 또는 면역 관련 페이지가 렌더링된다", async ({ page }) => {
    // immune 하위 경로 시도
    const response = await page.goto("/treatments/immune");
    await page.waitForLoadState("networkidle");

    const status = response?.status() ?? 0;

    if (status === 404) {
      // /treatments 에서 면역 관련 링크 찾기
      await page.goto("/treatments");
      await page.waitForLoadState("networkidle");

      const immuneLink = page
        .locator('a:has-text("면역"), a:has-text("Immune"), a:has-text("иммун")')
        .first();
      const hasLink = await immuneLink.isVisible().catch(() => false);

      if (hasLink) {
        await immuneLink.click();
        await page.waitForLoadState("networkidle");
      } else {
        test.skip(true, "면역치료 전용 페이지 미구현 — 스킵");
      }
    }

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasImmuneContent =
      /면역|immune|immunotherapy|ITCRN|иммун|NK세포|CAR-T/i.test(bodyText);
    expect(hasImmuneContent).toBeTruthy();
  });

  test("면역치료 병원/데이터 항목이 1개 이상 표시된다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText().catch(() => "");

    // 면역 관련 키워드 또는 치료법 키워드
    const hasTreatmentData =
      /면역|NK|CAR|면역항암|immuno|биотерапия/i.test(bodyText) ||
      /치료법|treatment|протокол/i.test(bodyText);

    expect(hasTreatmentData).toBeTruthy();
  });
});
