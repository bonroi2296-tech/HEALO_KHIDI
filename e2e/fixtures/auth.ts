/**
 * E2E 인증 헬퍼 — 실제 환자 PII 사용 금지, 더미 계정만
 *
 * 환경변수 (GitHub Actions Secrets 에 등록):
 *   E2E_TEST_USER_EMAIL    — 환자 테스트 계정 (더미)
 *   E2E_TEST_USER_PASSWORD
 *   E2E_ADMIN_EMAIL        — 어드민 테스트 계정 (더미)
 *   E2E_ADMIN_PASSWORD
 */

import { type Page } from "@playwright/test";

export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || "e2e-patient@healo-test.invalid",
  password: process.env.E2E_TEST_USER_PASSWORD || "E2eTest1234!",
  name: "E2E Test Patient",
  country: "KZ",
};

export const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL || "e2e-admin@healo-test.invalid",
  password: process.env.E2E_ADMIN_PASSWORD || "E2eAdmin1234!",
};

/**
 * Supabase email/password 로그인 (공통)
 */
export async function loginAs(
  page: Page,
  role: "patient" | "admin" = "patient"
): Promise<void> {
  const creds = role === "admin" ? ADMIN_USER : TEST_USER;

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"]').first();
  const pwInput = page.locator('input[type="password"]').first();

  await emailInput.fill(creds.email);
  await pwInput.fill(creds.password);
  await page.getByRole("button", { name: /로그인|sign in|login/i }).first().click();

  // 로그인 완료 대기 — URL 변경 or 대시보드 heading
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10_000,
  });
}
