/**
 * E2E: 국내 병원 백오피스 접근 (@smoke)
 *
 * 배경(2026-07-28, docs/KNOWN_ISSUES.md): 역할별 세션 저장 목록(`e2e/auth.setup.ts`)에
 *   `hospital` 만 **아예 없어서** `/hospital/*` 는 어떤 방법으로도 자동 확인이 안 됐다.
 *   핸드오프에는 "계정 접근 불가로 못 봄" 으로 반복 기록됐는데, 원인은 계정을 몰라서가
 *   아니라 «목록에 없어서» 였다. 다른 역할(agency·clinic)과 같은 수준으로 맞춘다.
 *
 * 무엇을 잠그나: 병원 계정이 문지기(PortalGate → /api/partner/whoami)를 통과해
 *   포털 안쪽 화면(프로필·진료항목)까지 실제로 들어가진다.
 *
 * 활성: E2E_HOSPITAL_EMAIL/PASSWORD Secrets 등록 시 (없으면 skip). docs/E2E_SECRETS_SETUP.md 참고.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";
import { HOSPITAL_CONTENT_ENABLED } from "../app/hospital/_components/featureFlags";

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
    // (그 카드에도 "병원"이 들어 있어 아래 정규식만으론 못 가른다 → 카드 부재를 따로 잠근다.)
    await expect(page.getByText("접근 권한 없음")).toHaveCount(0);
    // 2026-08-25 정정: 예전엔 `getByText(/리드|병원|프로필|진료/).first()` 로 잡았는데,
    //   그 정규식의 **첫 매치가 폰용 상단바 글자**(`lg:hidden`)라 데스크톱 폭에서는 «있지만 안 보이는»
    //   요소였다. 통과/실패가 «폰 상단바가 언제 마운트되나» 하는 타이밍에 좌우돼(먼저 그려지면 실패)
    //   코드와 무관하게 흔들렸다 — 실측으로 main 에서도 같은 구조임을 확인했다(첫 매치 visible=false).
    //   → 화면 폭과 무관하게 «포털 본문이 그려졌나»만 보는 제목으로 잠근다. 문지기 카드엔 이 제목이 없다.
    await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible({ timeout: 15_000 });
  });

  // 2026-07-29 실측으로 정정: 이 둘이 «대시보드로 되돌아가는» 것은 버그가 아니라 기능 플래그다
  // (`featureFlags.js` HOSPITAL_CONTENT_ENABLED=false, PO 결정 2026-06-24 — 공개 프론트 미연동).
  // 이전 판정(`toContain("/hospital")`)은 /hospital 과 /hospital/profile 을 못 갈라서
  // 되돌아가도 통과했다 — 정확한 경로로 잠근다. 플래그를 켜면 기대값이 자동으로 뒤집힌다.
  test("병원 정보·시술 카탈로그는 플래그대로 동작한다(꺼짐=대시보드로, 켜짐=그대로)", async ({ page }) => {
    for (const path of ["/hospital/profile", "/hospital/treatments"]) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).not.toContain("/login");
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
        .toBe(HOSPITAL_CONTENT_ENABLED ? path : "/hospital");
    }
  });
});
