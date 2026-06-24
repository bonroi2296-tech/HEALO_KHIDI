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

// 코디네이터 테스트 계정 (docs/TEST_ACCOUNTS.md: coordinator@test.com / test1234)
export const COORDINATOR_USER = {
  email: process.env.E2E_COORDINATOR_EMAIL || "e2e-coordinator@healo-test.invalid",
  password: process.env.E2E_COORDINATOR_PASSWORD || "E2eCoord1234!",
};

// 해외 에이전시 테스트 계정 (agency_users.partner_type='agency')
export const AGENCY_USER = {
  email: process.env.E2E_AGENCY_EMAIL || "e2e-agency@healo-test.invalid",
  password: process.env.E2E_AGENCY_PASSWORD || "E2eAgency1234!",
};

// 해외 의료기관 테스트 계정 (agency_users.partner_type='medical_institution')
export const CLINIC_USER = {
  email: process.env.E2E_CLINIC_EMAIL || "e2e-clinic@healo-test.invalid",
  password: process.env.E2E_CLINIC_PASSWORD || "E2eClinic1234!",
};

/**
 * Supabase email/password 로그인 (공통)
 */
export async function loginAs(
  page: Page,
  role: "patient" | "admin" | "coordinator" | "agency" | "clinic" = "patient"
): Promise<void> {
  const creds =
    role === "admin"
      ? ADMIN_USER
      : role === "coordinator"
        ? COORDINATOR_USER
        : role === "agency"
          ? AGENCY_USER
          : role === "clinic"
            ? CLINIC_USER
            : TEST_USER;

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.locator('input[type="email"]').first();
  const pwInput = page.locator('input[type="password"]').first();

  await emailInput.fill(creds.email);
  await pwInput.fill(creds.password);
  // 로그인 버튼 텍스트는 i18n(t("auth.login")) 이라 언어에 따라 달라짐 → 언어 안 타는
  // form submit 버튼으로 타깃(로그인 폼의 유일한 type=submit).
  await page.locator('button[type="submit"]').first().click();

  // 로그인 완료 대기 — URL 변경(성공 시 역할별 라우트로 push).
  // 로그인 핸들러가 whoami 2개 + 목적지 라우트를 거치는데, CI/로컬 모두 `npm run dev`(콜드 컴파일)
  // 라 첫 진입이 느림 → 타임아웃 넉넉히(10s 는 콜드 서버에서 자주 초과).
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}
