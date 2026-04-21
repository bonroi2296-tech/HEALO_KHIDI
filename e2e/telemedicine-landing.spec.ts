/**
 * E2E: /telemedicine 전용 랜딩 페이지
 *
 * 검증:
 * - 4개 주요 섹션 모두 렌더링
 * - CTA → /inquiry 이동
 * - FAQ 클릭 시 펼침
 */

import { test, expect } from "@playwright/test";

test.describe("/telemedicine 랜딩", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/telemedicine");
  });

  test("주요 섹션 모두 렌더링", async ({ page }) => {
    // HERO
    await expect(
      page.getByRole("heading", { name: /specialist|전문의/i }).first()
    ).toBeVisible();

    // HOW IT WORKS 01~04
    await expect(page.getByText("01").first()).toBeVisible();
    await expect(page.getByText("04").first()).toBeVisible();

    // Features (최소 일부 키워드)
    await expect(page.getByText(/HD video|HD 영상/i)).toBeVisible();
    await expect(page.getByText(/interpretation|통역/i)).toBeVisible();

    // FAQ 존재
    await expect(page.getByText(/FAQ|자주 묻는|Frequently/i).first()).toBeVisible();

    // Final CTA
    await expect(page.getByText(/Start now|지금 시작/i).first()).toBeVisible();
  });

  test("상담 신청 CTA → /inquiry", async ({ page }) => {
    // 여러 CTA 중 첫 번째 (hero)
    await page
      .getByRole("link", { name: /Request consultation|상담 신청/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/inquiry/);
  });

  test("FAQ 아이템 클릭 시 펼쳐짐", async ({ page }) => {
    const firstQuestion = page.locator("details summary").first();
    await firstQuestion.scrollIntoViewIfNeeded();
    await firstQuestion.click();

    // details 가 열려있는지 (open attribute)
    const details = page.locator("details").first();
    await expect(details).toHaveAttribute("open", "");
  });
});
