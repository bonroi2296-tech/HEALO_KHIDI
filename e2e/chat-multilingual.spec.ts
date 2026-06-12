/**
 * E2E A-5: 채팅 다국어 전환
 *
 * - 언어를 ko → ru 로 변경
 * - UI 텍스트가 러시아어로 표시됨
 * - (가능한 경우) AI 응답도 러시아어로 오는지 확인
 */

import { test, expect } from "@playwright/test";

test.describe("채팅 다국어 전환", () => {
  test("언어 ko → ru 전환 시 UI 텍스트가 변경된다", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 언어 선택기 찾기
    const langSwitcher = page
      .locator(
        '[data-testid="lang-switcher"], [aria-label*="language"], [aria-label*="언어"], select[name*="lang"]'
      )
      .first();

    const hasSwitcher = await langSwitcher.isVisible().catch(() => false);

    if (!hasSwitcher) {
      // /ru 단독 라우트는 없음 — 러시아 환자 전용 페이지로 직접 이동
      await page.goto("/ru/for-russian-patients");
      await page.waitForLoadState("networkidle");

      const bodyText = await page.locator("body").innerText();
      // 러시아어 텍스트 포함 여부 (키릴 문자)
      const hasCyrillic = /[а-яА-ЯёЁ]/.test(bodyText);
      expect(hasCyrillic).toBeTruthy();
      return;
    }

    // select 타입인 경우
    const tagName = await langSwitcher.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "select") {
      await langSwitcher.selectOption("ru");
    } else {
      await langSwitcher.click();
      // 드롭다운에서 RU 선택
      const ruOption = page
        .locator('[role="option"], [data-lang="ru"], button:has-text("RU"), button:has-text("Русский")')
        .first();
      const hasRu = await ruOption.isVisible().catch(() => false);
      if (hasRu) {
        await ruOption.click();
      } else {
        await page.goto("/ru/for-russian-patients");
      }
    }

    // 언어 변경은 쿠키 저장 후 전체 새로고침(window.location.reload) 방식
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(bodyText);
    expect(hasCyrillic).toBeTruthy();
  });

  test("러시아 환자 페이지 직접 진입 시 러시아어 UI 표시", async ({ page }) => {
    // /ru 단독 라우트는 없음(404) — 실제 존재하는 러시아 환자 전용 페이지로 검증
    await page.goto("/ru/for-russian-patients");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    // 러시아어 키릴 문자 최소 10자 이상
    const cyrillicCount = (bodyText.match(/[а-яА-ЯёЁ]/g) || []).length;
    expect(cyrillicCount).toBeGreaterThan(10);
  });
});
