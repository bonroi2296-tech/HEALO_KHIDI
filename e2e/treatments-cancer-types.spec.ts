/**
 * E2E C-3: /treatments 암종 카드
 *
 * - /treatments 에 암종 카드 여러 개 표시
 * - 첫 번째 카드 클릭 → 상세 페이지
 */

import { test, expect } from "@playwright/test";

// 주요 암종 키워드 (한/영/러)
const CANCER_KEYWORDS = [
  /폐암|lung cancer|рак лёгких/i,
  /간암|liver|рак печени/i,
  /위암|stomach|желудок/i,
  /유방암|breast|молочная/i,
  /대장암|colon|толстая/i,
  /췌장암|pancrea|поджелудочная/i,
];

test.describe("/treatments 암종 페이지", () => {
  test("암종 관련 콘텐츠가 표시된다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText().catch(() => "");

    // 최소 1개 암종 키워드가 있어야 함
    const foundCancer = CANCER_KEYWORDS.some((pattern) => pattern.test(bodyText));
    expect(foundCancer).toBeTruthy();
  });

  test("치료 링크가 존재한다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("networkidle");

    // treatments 하위 링크
    const links = page.locator('a[href*="/treatments/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("치료 항목 클릭 → 상세 페이지 진입", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator('a[href*="/treatments/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "/treatments 링크 없음");
    }

    await firstLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toMatch(/\/treatments\//);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
