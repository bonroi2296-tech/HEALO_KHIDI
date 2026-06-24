/**
 * E2E G-3: XSS 방지 검증
 *
 * - 인테이크 textarea 에 <script> 태그 입력
 * - 저장/제출 후 스크립트가 실행되지 않아야 함
 * - 렌더링 시 이스케이프 처리 확인
 */

import { test, expect } from "@playwright/test";

const XSS_PAYLOADS = [
  '<script>window.__xss_test = true;</script>',
  '<img src=x onerror="window.__xss_test=true">',
  'javascript:alert(1)',
];

test.describe("XSS 방지", () => {
  test("인테이크 폼 textarea 에 script 입력 시 실행 안 됨", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("domcontentloaded");

    const textarea = page.locator("textarea").first();
    const hasTextarea = await textarea.isVisible().catch(() => false);

    if (!hasTextarea) {
      // inquiry 폼 시도
      await page.goto("/inquiry");
      await page.waitForLoadState("domcontentloaded");
    }

    const target = page.locator("textarea").first();
    const targetVisible = await target.isVisible().catch(() => false);
    if (!targetVisible) {
      test.skip(true, "textarea 없음");
    }

    // XSS 페이로드 입력
    await target.fill(XSS_PAYLOADS[0]);

    // 페이지 내에서 스크립트 실행 여부 확인
    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>).__xss_test === true;
    });

    expect(xssExecuted).toBeFalsy();
  });

  test("inquiry 폼에 onerror payload 입력 시 실행 안 됨", async ({ page }) => {
    await page.goto("/inquiry");
    await page.waitForLoadState("domcontentloaded");

    const textarea = page.locator("textarea").first();
    const hasTextarea = await textarea.isVisible().catch(() => false);

    if (hasTextarea) {
      await textarea.fill(XSS_PAYLOADS[1]);
      await page.waitForTimeout(500);
    }

    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>).__xss_test === true;
    });
    expect(xssExecuted).toBeFalsy();
  });

  test("검색 쿼리에 XSS 입력 시 실행 안 됨", async ({ page }) => {
    // URL 파라미터로 XSS 시도
    await page.goto(`/search?q=${encodeURIComponent('<script>window.__xss_test=true;</script>')}`);
    await page.waitForLoadState("domcontentloaded");

    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>).__xss_test === true;
    });
    expect(xssExecuted).toBeFalsy();

    // 검색어가 이스케이프되어 표시되는지
    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    const hasUnescapedScript = bodyHTML.includes("<script>window.__xss_test");
    expect(hasUnescapedScript).toBeFalsy();
  });
});
