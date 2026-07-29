/**
 * E2E: 국내 병원 백오피스 접근 (@smoke)
 *
 * 배경(2026-07-28, docs/KNOWN_ISSUES.md): 역할별 세션 저장 목록(`e2e/auth.setup.ts`)에
 *   `hospital` 만 **아예 없어서** `/hospital/*` 는 어떤 방법으로도 자동 확인이 안 됐다.
 *   핸드오프에는 "계정 접근 불가로 못 봄" 으로 반복 기록됐는데, 원인은 계정을 몰라서가
 *   아니라 «목록에 없어서» 였다. 다른 역할(agency·clinic)과 같은 수준으로 맞춘다.
 *
 * 무엇을 잠그나: 병원 계정이 문지기(HospitalGateClient → /api/partner/whoami)를 통과해
 *   포털 안쪽 화면(프로필·진료항목)까지 실제로 들어가진다.
 *
 * 활성: E2E_HOSPITAL_EMAIL/PASSWORD Secrets 등록 시 (없으면 skip). docs/E2E_SECRETS_SETUP.md 참고.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("국내 병원 백오피스 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_HOSPITAL_EMAIL) {
      test.skip(true, "E2E_HOSPITAL_EMAIL 미설정 — 병원 인증 필요 테스트 스킵");
    }
    await loginAs(page, "hospital");
  });

  test("인증된 병원 계정이 /hospital 포털에 들어간다(로그인·홈으로 안 튕김)", async ({ page }) => {
    await page.goto("/hospital");
    await page.waitForLoadState("domcontentloaded");

    expect(page.url()).not.toContain("/login");
    // 홈으로 되돌아가는 증상(핸드오프 기록)을 정확히 잡는다 — 경로가 살아 있어야 한다.
    expect(new URL(page.url()).pathname).toContain("/hospital");
    // 문지기가 막으면 "권한 없음" 카드가 뜬다 → 그 카드가 아니라 포털 본문이 보여야 통과.
    await expect(page.getByText(/리드|병원|프로필|진료/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("병원 프로필·진료항목 화면이 열린다", async ({ page }) => {
    for (const path of ["/hospital/profile", "/hospital/treatments"]) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).not.toContain("/login");
      expect(new URL(page.url()).pathname).toContain("/hospital");
    }
  });
});
