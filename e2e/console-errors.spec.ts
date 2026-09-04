/**
 * E2E: 화면이 «뒤에서 내는 오류»를 듣는다 @smoke
 *
 * 왜 이 시험이 생겼나 (2026-08-05):
 *   PO 가 코디 대시보드를 손으로 한 번 열어 10초 만에 빨간 오류창을 봤다.
 *   같은 화면을 나는 백 번 넘게 훑고도 「이상 없음」이라고 했다. 이유가 셋이었다.
 *     ① 그 오류는 «개발 화면에서만» 뜬다 — 실서비스는 지우고 내보낸다.
 *        (실측: 같은 코드, 실서비스 /coordinator 에서 경고 0건 / 개발 화면에서 1건)
 *     ② 나는 «모양»(폭·잘림)만 쟀고 화면이 내는 말은 한 번도 안 들었다.
 *     ③ 그 화면을 «안 간 게 아니라» 가고도 못 들었다. 자가 틀렸던 것.
 *   실제로 잡힌 것: 대시보드 숫자 칸 두 개가 같은 이름표를 써서 하나가 사라질 수 있었다.
 *
 * 그래서 사람 눈이 아니라 여기서 막는다 — 개발 화면을 열어 오류가 하나라도 나오면 실패.
 *
 * ⚠️ 이 시험은 «개발 서버»에서만 뜻이 있다. 실서비스 대상(E2E_BASE_URL 이 http 로 시작하지
 *    않는 localhost 가 아닐 때)에서는 애초에 안 나오므로 건너뛴다 — 「통과」로 착각하지 않게.
 */

import { test, expect, type ConsoleMessage } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

/** 우리 잘못이 아닌 잡음 — 개발서버 안내·확장프로그램·광고차단·외부 자원 */
const NOISE =
  /Download the React DevTools|Fast Refresh|\[Fast Refresh\]|webpack-hmr|net::ERR_BLOCKED_BY_CLIENT|AdGuard|favicon|Failed to load resource: the server responded with a status of 40[34]|ResizeObserver loop/i;

/** 반드시 잡아야 하는 것 — 화면이 잘못 그려질 수 있다는 신호 */
const REAL_ERROR =
  /same key|unique "key"|Each child in a list|Cannot update a component|Maximum update depth|is not a function|Cannot read propert|undefined is not|Warning: Received|validateDOMNesting/i;

type Role = "coordinator" | "admin";

const SCREENS: Array<{ role: Role; paths: string[] }> = [
  {
    role: "coordinator",
    paths: [
      "/coordinator",
      "/coordinator/inbox",
      "/coordinator/cases",
      "/coordinator/consultations",
      "/coordinator/requests",
    ],
  },
  {
    role: "admin",
    paths: ["/admin", "/admin/inquiries", "/admin/khidi/cases", "/admin/users"],
  },
];

const isLocalDev = (process.env.E2E_BASE_URL || "http://localhost:3000").includes("localhost");

test.describe("화면이 내는 오류 @smoke", () => {
  for (const { role, paths } of SCREENS) {
    test(`${role} 화면들이 오류 없이 그려진다`, async ({ page }) => {
      // 화면 여러 개를 도니 기본 상한(30초)으로는 모자란다 — 화면 하나당 콜드 컴파일이 붙는다.
      test.setTimeout(150_000);
      test.skip(!isLocalDev, "개발 서버에서만 뜻이 있는 검사 — 실서비스 대상 실행에선 건너뜀");
      const envKey = role === "admin" ? "E2E_ADMIN_EMAIL" : "E2E_COORDINATOR_EMAIL";
      test.skip(!process.env[envKey], `${envKey} 미설정`);

      await page.addInitScript(() => {
        try {
          localStorage.setItem("healo_cookie_consent", "all");
        } catch {}
      });
      await loginAs(page, role);

      const found: string[] = [];
      const pending: Promise<void>[] = [];
      const onMsg = (m: ConsoleMessage) => {
        if (m.type() !== "error" && m.type() !== "warning") return;
        const text = m.text();
        if (NOISE.test(text)) return;
        if (!REAL_ERROR.test(text)) return;
        const where = page.url().replace(/^https?:\/\/[^/]+/, "");
        const head = text.replace(/\s+/g, " ").slice(0, 200);
        // React 는 «Encountered two children with the same key, `%s`» 처럼 값을 «따로» 넘긴다.
        // 첫 인자만 적으면 화면에 %s 만 남아 «어떤 키가 겹쳤는지»를 영영 못 본다 — 실제로
        // 2026-09-04 에 이 경고 하나를 두고 로컬 재현을 네 번 시도했고 끝내 못 좁혔다.
        // 그래서 나머지 인자를 풀어 붙인다(값이 안 풀리면 조용히 넘어간다 — 시험을 못 죽인다).
        pending.push(
          (async () => {
            let extra = "";
            try {
              const args = m.args().slice(1);
              if (args.length) {
                const vals = await Promise.all(args.map((a) => a.jsonValue().catch(() => "?")));
                extra = ` [값: ${vals.map((v) => JSON.stringify(v)).join(", ").slice(0, 200)}]`;
              }
            } catch { /* 인자 못 읽어도 경고 자체는 남긴다 */ }
            found.push(`${where} → ${head}${extra}`);
          })(),
        );
      };
      page.on("console", onMsg);
      page.on("pageerror", (e) => found.push(`${page.url()} → [예외] ${e.message.slice(0, 200)}`));

      for (const path of paths) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000); // 화면이 자료를 받아 다 그릴 때까지 — 오류는 그때 나온다
        // 로그인 게이트에 튕겼으면 이 화면은 잰 게 아니다 — 「이상 없음」이 거짓이 되지 않게 멈춘다.
        expect(new URL(page.url()).pathname, `${path} 에서 로그인 화면으로 튕겼다 — 세션 확인 필요`).not.toContain("/login");
      }
      page.off("console", onMsg);
      // 인자 풀이는 비동기라 여기서 마저 기다린다 — 안 기다리면 «값» 칸이 빈 채로 판정한다.
      await Promise.all(pending);

      expect(
        [...new Set(found)],
        "화면이 오류를 냈다 — 이대로 두면 실서비스에서는 «조용히» 잘못 그려진다"
      ).toEqual([]);
    });
  }
});
