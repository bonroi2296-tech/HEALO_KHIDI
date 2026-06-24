/**
 * E2E: 해외 의료기관 백오피스 접근 (@smoke)
 *
 * 배경(POSTMORTEMS #35 S3): /clinic 은 /agency 와 함께 E2E 스펙이 *하나도 없던* 사각지대.
 *   /clinic 은 /agency 와 동일 본체(PartnerPortal)지만 partner_type='medical_institution' 게이팅이라
 *   별도 회귀 가능 → 인증된 의료기관 계정이 /clinic 에 실제로 들어가진다를 잠근다.
 *
 * 활성: E2E_CLINIC_EMAIL/PASSWORD Secrets 등록 시 (없으면 skip). docs/E2E_SECRETS_SETUP.md 참고.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("의료기관 백오피스 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_CLINIC_EMAIL) {
      test.skip(true, "E2E_CLINIC_EMAIL 미설정 — 의료기관 인증 필요 테스트 스킵");
    }
    await loginAs(page, "clinic");
  });

  test("인증된 의료기관이 /clinic 포털에 들어간다(로그인으로 안 튕김)", async ({ page }) => {
    await page.goto("/clinic");
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).not.toContain("/login");
    await expect(page.getByText(/포털|의료기관|의뢰/).first()).toBeVisible({ timeout: 15_000 });
  });
});
