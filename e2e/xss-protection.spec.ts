/**
 * E2E G-3: XSS 방지 검증
 *
 * - 환자가 쓴 글이 «화면에 다시 그려질 때» 태그로 살아나지 않아야 함
 * - 검색어(URL 파라미터)로 넣어도 마찬가지
 *
 * ⚠️ 2026-08-25 고침: 예전엔 /intake 의 textarea 를 찾다 «없으면 건너뜀»으로 빠졌다.
 *    /intake 는 이미 없어진 주소이고, /inquiry 첫 화면은 갈래 고르는 칸이라 글칸이 없다.
 *    의뢰서(/inquiry/referral)도 「전체」를 골라 봤지만 첫 단계엔 글칸이 없다(실측: textarea 0개).
 *    그래서 이 검사는 만들어진 뒤 한 번도 돈 적이 없다.
 *
 *    자리를 공개 AI 상담으로 옮겼다. 여기가 «내가 쓴 글이 곧바로 말풍선으로 다시 그려지는»
 *    유일한 공개 경로라, 글칸에 값만 넣어 보던 예전 방식보다 실제 XSS 경로에 가깝다.
 *    대화 한 건에서 두 payload 를 연달아 보낸다(대화·AI 호출을 늘리지 않으려고).
 */

import { test, expect } from "@playwright/test";
import { openPublicChat } from "./fixtures/publicChat";

const XSS_PAYLOADS = [
  '<script>window.__xss_test = true;</script>',
  '<img src=x onerror="window.__xss_test=true">',
];

test.describe("XSS 방지", () => {
  test("환자가 쓴 글이 말풍선으로 그려질 때 스크립트가 살아나지 않는다", async ({ page }) => {
    test.setTimeout(150_000);

    const input = await openPublicChat(page);

    // 두 payload 를 «한 번에» 보낸다 — 보내는 동안 입력칸이 잠겨서, 연달아 보내려 하면
    // 두 번째가 첫 응답이 끝날 때까지 못 들어간다(2026-08-25 실제로 그래서 늘어졌다).
    const both = XSS_PAYLOADS.join(" ");
    await input.fill(both);
    await input.press("Enter");
    // 내 말풍선이 그려질 때까지 — AI 응답은 기다리지 않는다(이 검사와 무관).
    await expect(page.locator('[data-testid="chat-msg-user"]').last()).toContainText(
      "__xss_test",
      { timeout: 45_000 }
    );

    const xssExecuted = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__xss_test === true
    );
    expect(xssExecuted, "환자가 쓴 스크립트가 실행됐다").toBeFalsy();

    // 글자가 «태그»로 살아났는지 — 화면에 script/img 로 붙으면 안 된다.
    const injected = await page.evaluate(
      () =>
        document.querySelectorAll('img[onerror]').length +
        [...document.querySelectorAll("script")].filter((s) =>
          (s.textContent || "").includes("__xss_test")
        ).length
    );
    expect(injected, "환자가 쓴 글이 태그로 살아났다").toBe(0);
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
