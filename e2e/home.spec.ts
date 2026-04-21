/**
 * E2E: 메인 홈페이지 기본 흐름
 *
 * 검증:
 * - 홈 로드 시 HEALO 로고 + 원격협진 nav 노출
 * - 원격협진 Nav 클릭 → /telemedicine 이동
 * - 히어로 골드 리본 배너 클릭 → /telemedicine 이동
 */

import { test, expect } from "@playwright/test";

test.describe("홈페이지 진입점", () => {
  test("HEALO 로고 + 원격협진 Nav 가 노출된다", async ({ page }) => {
    await page.goto("/");

    // HEALO 워드마크
    await expect(page.locator("nav").getByText("HEALO").first()).toBeVisible();

    // 원격협진 메뉴 + NEW 배지
    const telemedicineLink = page.getByRole("link", {
      name: /telemedicine|원격협진/i,
    });
    await expect(telemedicineLink.first()).toBeVisible();
  });

  test("Nav 의 원격협진 클릭 시 /telemedicine 이동", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /telemedicine|원격협진/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/telemedicine/);
    await expect(
      page.getByRole("heading", { name: /specialist|전문의/i }).first()
    ).toBeVisible();
  });

  test("히어로 하단 골드 배너 CTA 로 /telemedicine 이동", async ({ page }) => {
    await page.goto("/");
    // 배너 안의 "NEW · Telemedicine" 텍스트 근처 링크
    const banner = page.getByText(/NEW · Telemedicine|NEW · 원격협진/i).first();
    await expect(banner).toBeVisible();
    await banner.click();
    await expect(page).toHaveURL(/\/telemedicine/);
  });
});
