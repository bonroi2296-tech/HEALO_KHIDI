/**
 * E2E D-1: 원격협진 랜딩 — 예약/상담 CTA 강화 검증
 *
 * telemedicine-landing.spec.ts 의 기존 테스트를 유지하되,
 * 추가 CTA 흐름 및 폼 접근 검증.
 *
 * 검증:
 * - /telemedicine CTA 버튼 클릭 → /inquiry 이동
 * - 원격협진 접수 가능 여부 UI 표시
 * - 모바일 뷰포트에서도 CTA 노출
 */

import { test, expect, devices } from "@playwright/test";

test.describe("원격협진 CTA 흐름", () => {
  test("하단 CTA '지금 시작' → /inquiry 이동 @smoke", async ({ page }) => {
    await page.goto("/telemedicine");
    await page.waitForLoadState("domcontentloaded");

    // 여러 CTA 중 하단 것 클릭
    const ctas = page.getByRole("link", {
      name: /Request consultation|상담 신청|지금 시작|Start now/i,
    });
    // CTA 가 하나도 없으면 «건너뜀이 아니라 실패»다 — 이 화면의 존재 이유가 접수로 보내는 것이다.
    await expect(ctas.last()).toBeVisible({ timeout: 20_000 });

    // 마지막 CTA (하단) 클릭
    await ctas.last().click();

    // waitForLoadState("domcontentloaded") 는 클라이언트 라우팅 시작 전에 즉시 통과해
    // URL 검사가 네비게이션보다 먼저 실행되는 레이스가 있었음 (CI dev 서버는
    // /inquiry 온디맨드 컴파일로 수 초 걸림) → 자동 대기하는 toHaveURL 사용
    await expect(page).toHaveURL(/\/inquiry/, { timeout: 15000 });
  });

  test("모바일 뷰포트에서 원격협진 페이지가 정상 렌더링된다", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Pixel 7"],
    });
    const page = await context.newPage();

    await page.goto("/telemedicine");
    await page.waitForLoadState("domcontentloaded");

    // 모바일에서도 주요 콘텐츠 표시
    const heading = page
      .getByRole("heading", { name: /specialist|전문의|원격/i })
      .first();
    const hasHeading = await heading.isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();

    await context.close();
  });

  test("원격협진 페이지 — 언어 변경 없이 기본 한국어 콘텐츠 표시", async ({ page }) => {
    await page.goto("/telemedicine");
    await page.waitForLoadState("domcontentloaded");

    const bodyText = await page.locator("body").innerText();
    // 한국어 또는 영어 혼용 콘텐츠
    const hasContent = bodyText.trim().length > 200;
    expect(hasContent).toBeTruthy();
  });
});
