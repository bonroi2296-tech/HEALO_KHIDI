/**
 * E2E: 해외 에이전시 백오피스 접근 (@smoke)
 *
 * 배경(POSTMORTEMS #35 S3): /agency·/clinic 은 그동안 E2E 스펙이 *하나도 없는* 완전 사각지대였다.
 *   로그인 뒤 화면이 깨지거나 못 들어가도 자동검사가 못 잡음 → 사람이 발견.
 *   이 스모크는 "인증된 에이전시 계정이 /agency 포털에 실제로 들어가진다"를 잠근다(최소 회귀 차단).
 *
 * 활성: E2E_AGENCY_EMAIL/PASSWORD Secrets 등록 시 (없으면 skip). docs/E2E_SECRETS_SETUP.md 참고.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("에이전시 백오피스 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_AGENCY_EMAIL) {
      test.skip(true, "E2E_AGENCY_EMAIL 미설정 — 에이전시 인증 필요 테스트 스킵");
    }
    await loginAs(page, "agency");
  });

  test("인증된 에이전시가 /agency 포털에 들어간다(로그인으로 안 튕김)", async ({ page }) => {
    await page.goto("/agency");
    await page.waitForLoadState("domcontentloaded");

    // 미인증/권한없음이면 /login 으로 리다이렉트 → 그게 회귀(실패).
    expect(page.url()).not.toContain("/login");

    // 포털 랜드마크가 보이는지(공용 PartnerPortal 텍스트). 느린 콜드 컴파일 대비 넉넉히.
    await expect(page.getByText(/포털|에이전시|의뢰/).first()).toBeVisible({ timeout: 15_000 });
  });
});
