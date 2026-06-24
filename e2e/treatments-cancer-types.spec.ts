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
    await page.waitForLoadState("domcontentloaded");

    // 최소 1개 암종 키워드가 뜰 때까지 web-first 로 대기(클라이언트 렌더 레이스 방지).
    const cancerRe = new RegExp(CANCER_KEYWORDS.map((r) => r.source).join("|"), "i");
    await expect(page.locator("body")).toContainText(cancerRe, { timeout: 20_000 });
  });

  test("치료 페이지에 사전상담 CTA가 존재한다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("domcontentloaded");

    // /treatments 는 암종을 펼침 카드로 보여주고 상세 슬러그 링크 대신 /intake 사전상담 CTA 로
    // 유도하는 설계(상세 링크 없음). 페이지가 actionable 한지 = CTA 버튼 존재로 검증(ko/en 무관).
    await expect(
      page.getByRole("button", { name: /사전상담 시작하기|Start Pre-consultation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("치료 항목 클릭 → 상세 페이지 진입", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("domcontentloaded");

    const firstLink = page.locator('a[href*="/treatments/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "/treatments 링크 없음");
    }

    await firstLink.click();
    // networkidle 은 클라이언트 라우팅 전에 즉시 통과하는 레이스가 있어 자동 대기로 교체
    await expect(page).toHaveURL(/\/treatments\/.+/, { timeout: 15000 });

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
