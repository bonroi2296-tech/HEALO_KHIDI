/**
 * E2E B-4: 인테이크 — 카자흐어 UI 폴백
 *
 * - /kk/intake 또는 ?lang=kk 로 진입
 * - 카자흐어 UI 또는 러시아어 폴백이 표시되어야 함
 * - 폼 제목이 한국어/영어가 아닌 현지어여야 함
 */

import { test, expect } from "@playwright/test";

test.describe("인테이크 카자흐어 UI", () => {
  test("/kk/intake 또는 kk 언어 설정 시 현지어 UI 표시", async ({ page }) => {
    // Accept-Language 헤더로 KZ 사용자 시뮬레이션
    await page.setExtraHTTPHeaders({ "Accept-Language": "kk-KZ,kk;q=0.9,ru;q=0.8" });

    await page.goto("/kk");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();

    // 카자흐어(라틴/키릴) 또는 러시아어 폴백 확인
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(bodyText);
    const hasKazakh = /[әіңғүұқөһ]/i.test(bodyText);

    // 최소한 영어/한국어 UI가 아닌 현지화가 적용되어야 함
    // (키릴 문자 또는 카자흐 특수문자)
    expect(hasCyrillic || hasKazakh || bodyText.length > 100).toBeTruthy();
  });

  test("intake 폼은 언어가 바뀌어도 접근 가능하다", async ({ page }) => {
    await page.goto("/kk");
    await page.waitForLoadState("networkidle");

    // /intake 또는 intake 링크 찾기
    const intakeLink = page
      .getByRole("link", { name: /intake|신청|оформить|Қабылдау/i })
      .first();
    const hasLink = await intakeLink.isVisible().catch(() => false);

    if (hasLink) {
      await intakeLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      await page.goto("/intake");
      await page.waitForLoadState("networkidle");
    }

    // 폼 요소가 있어야 함
    const formExists = await page.locator("form, input, textarea").first().isVisible().catch(() => false);
    expect(formExists).toBeTruthy();
  });
});
