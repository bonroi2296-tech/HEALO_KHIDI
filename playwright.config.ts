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
    // 테스트마다 로그인해 공유 Supabase 를 포화시키던 부하 제거 (POSTMORTEMS #117).
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
        // 앞에 붙은 한 줄은 «힙 상한을 로그에 남기는 것»이다 — 아래 env 설정이 실제로
        // 먹었는지 눈으로 확인할 자리가 없으면 「재시작이 안 났다」가 우연인지 알 수 없다.
        command:
          `node -e "console.log('[heap] limit=' + Math.round(require('v8').getHeapStatistics().heap_size_limit/1048576) + 'MB')"` +
          " && npm run dev",
        /**
         * 🛑 2026-08-31: **매 실행 정확히 1건이 흔들렸다.**
         *
         * Next dev 서버는 요청을 처리한 «직후»마다 힙을 재서
         * `used_heap_size > 0.8 * heap_size_limit` 이면 스스로 재시작한다
         * (`next/dist/server/lib/utils.js` 의 `getMemoryRestartStats`).
         * 그 재시작 순간에 걸린 요청은 **`net::ERR_EMPTY_RESPONSE`** 를 받는다.
         *
         * 실측(E2E 3회 연속): 재시작 **매번 1회**. 그 1회가 어느 시험에 걸리느냐만 바뀌었다 —
         * `/contact` → `/intake`. 시험 이름은 「영어 화면에 한글 누출 없음」인데 실제 실패는
         * 「페이지가 아예 안 열림」이라, **이름만 보면 다국어 결함으로 오해한다.**
         *
         * → 힙 상한을 명시해 80% 도달을 늦춘다. `ubuntu-latest` 는 메모리 16GB 이므로
         *   6GB 는 넉넉히 안전하다. 재시작 «기능»은 그대로 둔다 — 진짜로 새면 여전히 돈다.
         *
         * ⚠️ CI 에서만 준다. 로컬 개발자 기계는 사양이 제각각이라 상한을 억지로 박으면
         *    작은 기계에서 오히려 해가 된다(안 주면 Node 가 시스템에 맞춰 잡는다).
         */
        env: process.env.CI ? { NODE_OPTIONS: "--max-old-space-size=6144" } : undefined,
        // 준비 판정 URL 을 "/"(홈 SSR — 콜드 컴파일 60s+ 에 Supabase 조회가 행 없이 매달림)
        // 대신 /api/health 로: 컴파일 가벼움 + DB 프로브가 3s 바운드(무한 대기 없음) +
        // DB 다운이면 503 = 미준비(Playwright 는 200~403 만 준비로 침 — 정직한 게이트).
        // "/" 를 판정에 걸면 Supabase 지연 시 240s 로도 부팅 오판(2026-07-24 실측, #117).
        url: baseURL + "/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
