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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
        timeout: 120_000,
      },
});
