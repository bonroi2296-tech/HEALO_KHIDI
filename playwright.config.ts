import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — HEALO E2E 테스트
 *
 * 실행:
 *   npm run e2e         # 기본 (chromium)
 *   npm run e2e:ui      # UI 모드
 *   npm run e2e:debug   # 디버그
 *
 * 환경변수:
 *   E2E_BASE_URL (default: http://localhost:3000)
 *   E2E_SKIP_SERVER (1 이면 dev 서버 자동 실행 안함 — 프로덕션 대상 테스트 시)
 */

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const skipServer = process.env.E2E_SKIP_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // 역할별 UI 로그인 1회 → 세션 저장 (e2e/auth.setup.ts). 테스트들은 쿠키 재사용 —
    // 테스트마다 로그인해 공유 Supabase 를 포화시키던 부하 제거 (POSTMORTEMS #116).
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      // 로그인 5개를 동시에 던지면 콜드 dev 서버가 기아 상태(로컬 워커 5개 실측 전멸)
      // + 공유 Supabase에 불필요한 동시 부하 → 역할 순차 실행.
      fullyParallel: false,
      // 역할당 1회뿐이라 넉넉히: 콜드 컴파일(로그인+역할 라우트) + Supabase 지연 흡수.
      // 전역 30s(테스트 기본)가 waitForURL 60s보다 먼저 끊던 함정 방지.
      timeout: 120_000,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // 원하면 추가:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // 로컬 실행 시 dev 서버 자동 시작
  webServer: skipServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        // 준비 판정이 "/" 첫 응답 = 콜드 컴파일 + SSR 의 Supabase 조회까지 포함.
        // 공유 Supabase 포화 시(REST 10~25s 실측) 120s 로는 2코어 러너에서 부팅 판정 실패
        // 가 실제로 났다(2026-07-24 attempt 2·3) → 240s (POSTMORTEMS #116).
        timeout: 240_000,
      },
});
