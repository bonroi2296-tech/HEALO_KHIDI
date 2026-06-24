/**
 * E2E F-1: 어드민 접근 제어 @smoke
 *
 * - 비인증 상태로 /admin/* 접근 시 차단
 * - 로그인 페이지 또는 403 에러
 */

import { test, expect } from "@playwright/test";

const ADMIN_ROUTES = [
  "/admin",
  "/admin/khidi/kpi-dashboard",
  "/admin/khidi/ai-feedback",
  "/admin/inquiries",
];

test.describe("어드민 인증 보호 @smoke", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const route of ADMIN_ROUTES) {
    test(`비인증 상태로 ${route} 접근 → 차단됨`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const currentUrl = page.url();
      const bodyText = await page.locator("body").innerText().catch(() => "");

      // 1. 로그인 페이지로 리다이렉트
      const isOnLogin =
        currentUrl.includes("/login") || currentUrl.includes("/auth");

      // 2. 접근 거부 메시지
      const hasAccessDenied =
        /권한|접근 거부|unauthorized|forbidden|403|로그인|login/i.test(bodyText);

      expect(isOnLogin || hasAccessDenied).toBeTruthy();

      // 어드민 데이터가 노출되면 안 됨
      const hasAdminData =
        /patient.*@.*\.com|환자.*이메일|pii|개인정보.*유출/i.test(bodyText);
      expect(hasAdminData).toBeFalsy();
    });
  }
});
