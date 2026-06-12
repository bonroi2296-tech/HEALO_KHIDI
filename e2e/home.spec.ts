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

    // HEALO 워드마크 — 워드마크는 <header> 안에 있고 <nav>는 메뉴 항목 전용
    await expect(page.locator("header").getByText("HEALO").first()).toBeVisible();

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

  // "골드 배너"는 Legacy 리디자인에서 폐기됨 (DESIGN.md) — 히어로 + 주요 진입점 검증으로 교체
  test("히어로 타이틀 렌더 + Care Journey 진입", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /second opinion|oncologist|암|종양/i }).first()
    ).toBeVisible();
    await page.getByRole("link", { name: /care journey|치료 여정/i }).first().click();
    await expect(page).toHaveURL(/\/care-journey/, { timeout: 15000 });
  });
});
