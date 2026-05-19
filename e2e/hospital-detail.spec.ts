/**
 * E2E C-2: 병원 상세 페이지
 *
 * - 목록에서 첫 번째 카드 클릭 → 상세 페이지로 이동
 * - 의료진 또는 시설 정보가 표시되어야 함
 */

import { test, expect } from "@playwright/test";

test.describe("병원 상세 페이지", () => {
  test("병원 카드 클릭 → 상세 페이지 진입", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("networkidle");

    // 첫 번째 병원 링크 클릭
    const firstLink = page
      .locator('a[href*="/hospitals/"]')
      .first();

    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) {
      // article 또는 카드 클릭 시도
      const firstCard = page.locator("article, .card, [class*='hospital']").first();
      const hasCard = await firstCard.isVisible().catch(() => false);
      if (!hasCard) {
        test.skip(true, "병원 목록 없음");
      }
      await firstCard.click();
    } else {
      await firstLink.click();
    }

    await page.waitForLoadState("networkidle");

    // URL 이 /hospitals/ 하위로 변경됨
    expect(page.url()).toMatch(/\/hospitals\//);
  });

  test("상세 페이지에 의료진 또는 시설 정보가 있다", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator('a[href*="/hospitals/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) {
      test.skip(true, "병원 링크 없음");
    }

    const href = await firstLink.getAttribute("href");
    if (href) {
      await page.goto(href);
    } else {
      await firstLink.click();
    }

    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText().catch(() => "");
    // 의료진, 시설, 전문, 치료 등 관련 키워드
    const hasMedicalInfo =
      /의료진|전문의|시설|치료|specialist|doctor|facility|treatment|врач|больница/i.test(bodyText);
    expect(hasMedicalInfo).toBeTruthy();
  });
});
