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
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText().catch(() => "");

    // KPI 관련 텍스트
    const hasKpiContent =
      /KPI|대시보드|dashboard|총|환자|신청|inquiry|문의/i.test(bodyText);
    expect(hasKpiContent).toBeTruthy();

    // 숫자 데이터가 최소 하나 표시 (0 이상의 수치)
    const hasNumbers = /\d+/.test(bodyText);
    expect(hasNumbers).toBeTruthy();
  });

  test("KPI 페이지에 차트 또는 통계 요소가 있다", async ({ page }) => {
    await page.goto("/admin/khidi/kpi-dashboard");
    await page.waitForLoadState("networkidle");

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
