/**
 * E2E F-2: 어드민 KPI 대시보드
 *
 * - 어드민 로그인 후 /admin/khidi/kpi-dashboard 접근
 * - 카드·차트 렌더링 확인
 *
 * 필요한 환경변수:
 *   E2E_ADMIN_EMAIL
 *   E2E_ADMIN_PASSWORD
 *
 * 미설정 시 스킵
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("어드민 KPI 대시보드", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip(true, "E2E_ADMIN_EMAIL 미설정 — 어드민 테스트 스킵");
    }
    await loginAs(page, "admin");
  });

  test("KPI 대시보드 페이지 렌더링 — 카드/수치 표시", async ({ page }) => {
    await page.goto("/admin/khidi/kpi-dashboard");
    await page.waitForLoadState("domcontentloaded");

    // 클라이언트가 KPI 데이터를 fetch 후 렌더하므로 web-first assertion 으로 내용 뜰 때까지 재시도
    // (networkidle 은 애널리틱스 때문에 안 settle → domcontentloaded + 재시도 대기).
    await expect(page.locator("body")).toContainText(
      /KPI|대시보드|dashboard|총|환자|신청|inquiry|문의/i,
      { timeout: 20_000 }
    );
    await expect(page.locator("body")).toContainText(/\d/, { timeout: 20_000 });
  });

  test("KPI 페이지에 차트 또는 통계 요소가 있다", async ({ page }) => {
    await page.goto("/admin/khidi/kpi-dashboard");
    await page.waitForLoadState("domcontentloaded");

    // recharts, SVG 차트, 또는 수치 카드
    const hasChart = await page
      .locator("svg, canvas, [class*='chart'], [class*='recharts']")
      .first()
      .isVisible()
      .catch(() => false);

    const hasStatCard = await page
      .locator("[class*='stat'], [class*='card'], [class*='metric']")
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasChart || hasStatCard).toBeTruthy();
  });
});
