/**
 * E2E: 어드민 사이드바 메뉴 렌더 + 접힘 동작 @smoke
 *
 * 왜 이 테스트가 있나:
 *   /admin 은 로그인 게이트(AdminGateClient) 뒤라, 일반 빌드·babel 파싱·비인증 HTTP 200
 *   으로는 AdminNav 의 새 렌더 로직(접힘 그룹·중첩 children·라벨)이 한 번도 실행되지 않는다.
 *   메뉴 재편(#479·#482·#484·#487) 같은 변경의 회귀를 "머지 전(PR smoke)"에 잡으려고 @smoke 로 단다.
 *
 * 필요한 환경변수: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (미설정 시 스킵)
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("어드민 사이드바 메뉴 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip(true, "E2E_ADMIN_EMAIL 미설정 — 어드민 테스트 스킵");
    }
    // 쿠키 동의 배너(fixed bottom-0, z-9999)가 사이드바 하단 버튼 클릭을 가로채므로
    // "이미 동의함" 상태로 시작한다(실사용자가 한 번 누르면 다시 안 뜨는 것과 동일).
    await page.addInitScript(() => {
      try {
        localStorage.setItem("healo_cookie_consent", "all");
      } catch {}
    });
    await loginAs(page, "admin");
  });

  test("로그인 후 /admin 사이드바가 렌더되고 핵심 메뉴가 보인다", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // 게이트(AdminGateClient) 통과 후 사이드바가 마운트될 때까지 web-first 재시도
    await expect(
      page.getByRole("link", { name: "중간평가 현황" })
    ).toBeVisible({ timeout: 20_000 });

    // 펼쳐진 기본 그룹 헤더 + 환자 여정 동선이 보인다
    await expect(page.getByText("운영 현황", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("환자 여정", { exact: false }).first()).toBeVisible();
  });

  test("기본 접힘 그룹(레거시 도구)을 헤더 클릭으로 펼칠 수 있다 — 데드 토글 회귀 방지", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("link", { name: "중간평가 현황" })
    ).toBeVisible({ timeout: 20_000 });

    // 레거시 도구는 collapsed:true → 자식 '대량 Import' 링크가 처음엔 DOM에 없다(open && 조건부 렌더).
    const importLink = page.getByRole("link", { name: "대량 Import" });
    await expect(importLink).toHaveCount(0);

    // 그룹 헤더(버튼)를 누르면 펼쳐져 자식이 나타난다.
    await page.getByRole("button", { name: /레거시 도구/ }).click();
    await expect(importLink).toBeVisible({ timeout: 5_000 });
  });
});
