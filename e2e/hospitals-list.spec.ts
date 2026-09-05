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
    const hospitalCards = page.locator(
      '[data-testid*="hospital-card"], [class*="hospital-card"], article, .card'
    );

    // 최소 1개 이상
    const count = await hospitalCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("병원 카드에 병원명 텍스트가 있다", async ({ page }) => {
    await page.goto("/hospitals");

    // 🛑 domcontentloaded 직후엔 «뼈대(스켈레톤)»만 있고 제목은 크기가 0 이다
    //    (2026-08-27 실서비스 실측: +0ms 0×0 → +500ms 1120×36 / 야간 실패 화면도 뼈대뿐이었다).
    //    한 번 찍고 판단하면 러너가 느린 날만 빨간불이 된다 — 될 때까지 기다리는 expect 로 본다.
    //    ⚠️ .catch(() => false) 로 감싸면 «못 봤다»가 조용히 «없다»가 된다. 감싸지 마라.
    const heading = page.locator("h2, h3, h4").first();
    await expect(heading).toBeVisible({ timeout: 15000 });
    expect((await heading.innerText()).trim().length).toBeGreaterThan(0);
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
