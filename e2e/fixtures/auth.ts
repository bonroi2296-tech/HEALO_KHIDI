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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// auth.setup.ts 가 역할별 1회 로그인 후 세션(쿠키)을 저장하는 위치 — .gitignore 대상
// (__dirname 금지 — repo 가 "type":"module" 이라 ESM 스코프)
export const AUTH_STATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".auth");
export const statePath = (role: string) => path.join(AUTH_STATE_DIR, `${role}.json`);

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

export type Role = "patient" | "admin" | "coordinator" | "agency" | "clinic";

/**
 * 역할별 로그인 — 저장된 세션(쿠키) 재사용이 기본, 없으면 UI 로그인 폴백.
 *
 * 왜(POSTMORTEMS #117): 테스트마다 UI 로그인을 하면 스모크 1회에 로그인 10회+
 * (retry 시 3배)가 공유 Supabase(프로덕션 겸용!)로 나간다. 그 DB 가 느려진 시간대엔
 * auth/REST 응답이 10~25초까지 늘어져(실측 trace) waitForURL 30s 를
 * 넘기고, 매번 다른 테스트가 떨어지는 복권이 됐다. auth.setup.ts 가 역할별 1회만
 * 로그인해 세션을 저장하고, 여기선 그 쿠키를 주입만 한다(@supabase/ssr = 쿠키 기반).
 */
export async function loginAs(page: Page, role: Role = "patient"): Promise<void> {
  const f = statePath(role);
  if (fs.existsSync(f)) {
    const { cookies } = JSON.parse(fs.readFileSync(f, "utf8"));
    if (cookies?.length) {
      await page.context().addCookies(cookies);
      return;
    }
  }
  // 폴백: 단일 스펙 로컬 실행 등 setup 을 안 거친 경우만 UI 로그인
  await uiLoginAs(page, role);
}

/**
 * Supabase email/password UI 로그인 — auth.setup.ts 전용.
 * 스펙에서 직접 부르지 말 것(부하 증폭 재유입 — check:content [e2e-ui-login] 가드가 차단).
 */
export async function uiLoginAs(page: Page, role: Role = "patient"): Promise<void> {
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
  // 역할당 1회만 도니 넉넉히 60s: dev 콜드 컴파일 + 공유 Supabase 지연(포화 시 10~25s 실측)을 흡수.
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });
}
