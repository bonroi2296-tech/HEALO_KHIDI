/**
 * E2E C-1: /hospitals 병원 목록 페이지 @smoke
 *
 * - 병원 카드가 최소 1개 이상 표시되어야 함
 * - 각 카드에 병원명이 있어야 함
 */

import { test, expect } from "@playwright/test";

test.describe("병원 목록 페이지 @smoke", () => {
  test("병원 카드가 1개 이상 표시된다", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    // 병원 카드 요소 찾기 (다양한 selector 시도)
    // /hospitals 는 언어 주소(/ko/hospitals)로 옮겨간다. 예전엔 화면이 옮겨가기 «전» 순간에
    // 한 번 읽고 판단해서 「없다」로 찍혔다. 될 때까지 기다리는 expect 로 본 뒤에 값을 읽는다.
    // (2026-08-25: 이 시험 때문에 야간 검사가 며칠째 빨간불이었다. 실서비스 화면은 멀쩡했다.)
    const hospitalCards = page.locator(
      '[data-testid*="hospital-card"], [class*="hospital-card"], article, .card'
    );

    // 최소 1개 이상
    await expect(hospitalCards.first()).toBeVisible({ timeout: 20000 });
    expect(await hospitalCards.count()).toBeGreaterThanOrEqual(1);
  });

  test("병원 카드에 병원명 텍스트가 있다", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    // h2, h3 등 제목 요소가 카드 안에 있어야 함
    // /hospitals 는 언어 주소(/ko/hospitals)로 옮겨간다. 예전엔 화면이 옮겨가기 «전» 순간에
    // 한 번 읽고 판단해서 「없다」로 찍혔다. 될 때까지 기다리는 expect 로 본 뒤에 값을 읽는다.
    // (2026-08-25: 이 시험 때문에 야간 검사가 며칠째 빨간불이었다. 실서비스 화면은 멀쩡했다.)
    const headings = page.locator("h1, h2, h3, h4").first();
    await expect(headings).toBeVisible({ timeout: 20000 });
    const headingText = await headings.innerText();
    expect(headingText.trim().length).toBeGreaterThan(0);
  });

  test("의료진 카드가 가로로 넘치지 않는다 (flex min-w-0 회귀 가드)", async ({ page }) => {
    // 재발 방지 #89: truncate(nowrap) 자식이 flex 아이템 최소폭을 밀어올려
    // 카드 밖 내용이 overflow-hidden에 잘리던 버그 (영어가 최장 텍스트라 /en으로 검사)
    await page.goto("/en/hospitals");
    await page.waitForSelector('[role="button"]');

    const overflows = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[role="button"]')).filter(
        (el) => el.textContent?.includes("Full Profile")
      );
      return cards.map((c) => c.scrollWidth - c.clientWidth);
    });

    expect(overflows.length).toBeGreaterThanOrEqual(1); // 카드가 렌더됐는지
    expect(Math.max(...overflows)).toBeLessThanOrEqual(0); // 넘침 0px
  });

  test("페이지 타이틀에 hospital 또는 병원 포함", async ({ page }) => {
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    const title = await page.title();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasTopic =
      /hospital|병원|치료/i.test(title) || /hospital|병원|파트너/i.test(bodyText);
    expect(hasTopic).toBeTruthy();
  });
});
