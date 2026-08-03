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

  // 위 검사는 «주소가 CSP 어딘가에 있나»만 본다 — 어느 «칸»에 있는지는 안 본다.
  // 2026-08-03: 그래서 반쪽이 통과했다. connect-src 에 integrations.livekit.io 를 넣어 파일
  // 받기는 됐는데(요청 200 실측), 잡음 제거가 소리 처리기(AudioWorklet)를 blob: 로 싣기 때문에
  // script-src 에 blob: 이 없어 **실행 단계에서 막혔다**. 워크릿은 worker-src 가 아니라
  // script-src 로 검사되고, 이 차단은 「보안정책 위반」 사건도 안 낸다
  // (`AbortError: Unable to load a worklet's module` 이라는 엉뚱한 이름으로만 나온다).
  // ⚠️ 2026-08-03 추가분: blob: 하나만 봐도 반쪽이었다. 같은 기능이 **세 겹**에 걸려 있었다 —
  //   ①connect-src(파일 받기) ②script-src blob:(워크릿 싣기) ③script-src 'wasm-unsafe-eval'
  //   (소리 모델이 WebAssembly 라 컴파일도 script-src 로 검사된다). 한 겹씩 열 때마다 다음 겹이
  //   «다른 이름의 에러»로 나와서, 열 때마다 실제로 재지 않으면 고친 줄 알고 넘어간다.
  test("잡음 제거가 켜질 수 있다 — script-src 에 blob: 과 'wasm-unsafe-eval'", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"] ?? "";
    const scriptSrc = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("script-src")) ?? "";
    expect(scriptSrc, "script-src 칸이 아예 없다").toBeTruthy();
    const parts = scriptSrc.split(/\s+/);
    expect(
      parts.includes("blob:"),
      "script-src 에 blob: 이 없다 — 소리 처리기(AudioWorklet)를 못 싣는다(worker-src 에 있어도 소용없다)"
    ).toBeTruthy();
    expect(
      parts.includes("'wasm-unsafe-eval'") || parts.includes("'unsafe-eval'"),
      "script-src 에 'wasm-unsafe-eval' 이 없다 — 잡음 제거 소리 모델(WebAssembly)이 컴파일 단계에서 막힌다"
    ).toBeTruthy();
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
