/**
 * E2E G-1: 보안 헤더 검증 @smoke
 *
 * - HTTP 응답에 CSP (Content-Security-Policy) 헤더 존재
 * - X-Frame-Options 또는 frame-ancestors 존재
 * - X-Content-Type-Options 존재
 *
 * Note: HSTS (Strict-Transport-Security) 는 HTTPS 환경에서만 검증 가능.
 * 로컬 HTTP 에서는 선택적.
 */

import { test, expect } from "@playwright/test";

test.describe("보안 HTTP 헤더 @smoke", () => {
  test("홈페이지 응답에 X-Content-Type-Options 헤더가 있다", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    // X-Content-Type-Options: nosniff
    const xContentType = headers["x-content-type-options"];
    expect(xContentType).toBeTruthy();
    expect(xContentType).toMatch(/nosniff/i);
  });

  test("홈페이지 응답에 X-Frame-Options 또는 CSP frame-ancestors 가 있다", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    const xFrameOptions = headers["x-frame-options"];
    const csp = headers["content-security-policy"];

    // 둘 중 하나는 있어야 함
    const hasFrameProtection =
      (xFrameOptions && /deny|sameorigin/i.test(xFrameOptions)) ||
      (csp && /frame-ancestors/i.test(csp));

    expect(hasFrameProtection).toBeTruthy();
  });

  test("API 엔드포인트 응답에 민감 정보가 헤더에 없다", async ({ page }) => {
    // inquiry API 간단 GET (404 응답이라도 헤더는 확인)
    const response = await page.goto("/api/inquiry");
    const headers = response?.headers() ?? {};

    // Server 헤더에 구체적인 버전 정보 없어야 함
    const serverHeader = headers["server"] ?? "";
    const hasVersionLeak = /apache\/\d|nginx\/\d|express\/\d/i.test(serverHeader);
    expect(hasVersionLeak).toBeFalsy();
  });
});
