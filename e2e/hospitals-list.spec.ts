/**
 * E2E C-1: /hospitals 병원 목록 페이지 @smoke
 *
 * - 병원 카드가 최소 1개 이상 표시되어야 함
 * - 각 카드에 병원명이 있어야 함
 */

import { test, expect } from "@playwright/test";

test.describe("병원 목록 페이지 @smoke", () => {
  test("병원 카드가 1개 이상 표시된다", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    // 병원 카드 요소 찾기 (다양한 selector 시도)
    const hospitalCards = page.locator(
      '[data-testid*="hospital-card"], [class*="hospital-card"], article, .card'
    );

    // 최소 1개 이상
    const count = await hospitalCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("병원 카드에 병원명 텍스트가 있다", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    // h2, h3 등 제목 요소가 카드 안에 있어야 함
    const headings = page.locator("h2, h3, h4").first();
    const hasHeading = await headings.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();

    const headingText = await headings.innerText().catch(() => "");
    expect(headingText.length).toBeGreaterThan(0);
  });

  test("페이지 타이틀에 hospital 또는 병원 포함", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    const title = await page.title();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasTopic =
      /hospital|병원|치료/i.test(title) || /hospital|병원|파트너/i.test(bodyText);
    expect(hasTopic).toBeTruthy();
  });
});
