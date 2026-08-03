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

  // 「기능이 조용히 안 도는」 부류를 잡는다.
  // 2026-08-03 실사고: 화상상담 잡음 제거(Krisp)가 켠 지 6일이 지나도록 한 번도 안 돌았다 —
  // 필요한 주소가 CSP 에 없어 브라우저가 막았는데, 켜기 실패는 통화를 안 끊으려고 삼키게 돼
  // 있어 화면엔 아무 표시가 안 났다. 배경 소음이 그대로 나가면 자막 오인식으로 직결된다.
  // → 기능이 실제로 쓰는 주소를 여기 적어두고 매번 대조한다(주소가 빠지면 이 검사가 빨간불).
  test("우리 기능이 쓰는 바깥 주소가 CSP 에 열려 있다", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"] ?? "";
    expect(csp, "CSP 헤더가 아예 없다").toBeTruthy();

    const required: Array<[string, string]> = [
      ["*.livekit.cloud", "화상상담 연결 자체"],
      ["integrations.livekit.io", "화상상담 잡음 제거(Krisp) — 없으면 조용히 안 켜진다"],
      ["*.supabase.co", "데이터베이스·로그인"],
      ["generativelanguage.googleapis.com", "자막·통역 AI"],
    ];
    const missing = required.filter(([host]) => !csp.includes(host));
    expect(
      missing.map(([h, why]) => `${h} (${why})`).join(" / "),
      "CSP 에 빠진 주소가 있다 — 그 기능은 아무 에러 없이 안 돈다"
    ).toBe("");
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
