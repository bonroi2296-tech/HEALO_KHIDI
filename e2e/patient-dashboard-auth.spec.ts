/**
 * E2E E-1: 환자 대시보드 — 비인증 리다이렉트 @smoke
 *
 * - 로그인 없이 /patient/* 접근 시 /login 으로 리다이렉트
 */

import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/patient",
  "/patient/symptoms",
  "/patient/consultations",
  "/patient/documents",
];

test.describe("환자 대시보드 인증 보호 @smoke", () => {
  test.beforeEach(async ({ context }) => {
    // 쿠키 초기화 — 비인증 상태
    await context.clearCookies();
  });

  for (const route of PROTECTED_ROUTES) {
    test(`미인증 상태로 ${route} 접근 → 로그인 페이지로 이동`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      // /login 으로 리다이렉트 또는 로그인 UI 표시
      const currentUrl = page.url();
      const isOnLogin =
        currentUrl.includes("/login") ||
        currentUrl.includes("/auth");

      const bodyText = await page.locator("body").innerText().catch(() => "");
      const hasLoginUI = /로그인|sign in|login|이메일|email/i.test(bodyText);

      expect(isOnLogin || hasLoginUI).toBeTruthy();
    });
  }
});
