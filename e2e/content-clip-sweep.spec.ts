import { test, expect } from "@playwright/test";
import { findClipped } from "./fixtures/clipCheck";

// 66회 페이지 로드 스윕이라 재시도(전역 retries:2)는 시간 3배 = 잡 25분 상한 위협 (독립 리뷰 A1)
test.describe.configure({ retries: 0 });

// ── 공개 페이지 "글자 잘림" 전수 스캔 — 읽을 콘텐츠가 상자 밖으로 절단되면 실패 (POSTMORTEMS #89) ──
// 왜: /hospitals 의료진 카드에서 flex min-w-0 누락으로 "Full Profile"이 "Fu…"로 잘렸는데,
//     시각 레이아웃 회귀를 잡는 기계 검사가 없어 PO 눈이 검사기였다(그 페이지만 4번째 제보).
//     페이지별 개별 가드(hospitals-list.spec)로는 다른 페이지가 사각지대 → 사이트맵 기반 전수 스캔.
// 실행 시점: @smoke 아님 → PR 게이트에선 안 돌고, main push 후 Full E2E(localhost)와
//     Production Nightly E2E(cron, 프로덕션)에서 돈다 (~66회 페이지 로드라 PR엔 무거움).
// 검출 정의(오탐 억제 — 2026-07-14 실서비스 38회 스캔으로 보정):
//     "직접 텍스트를 가진 요소"가 가장 가까운 가로 클리핑 조상(overflow-x hidden/clip)의
//     좌우 경계를 4px 이상 넘으면 = 읽을 글자가 잘리는 중. 아래는 의도된 패턴이라 제외:
//     ①sr-only(접근성 숨김) ②truncate/line-clamp(의도된 말줄임) ③경로상 transform 존재
//     (캐러셀/슬라이더/마퀴는 translate로 움직임) ④Google Maps 내부(.gm-style)
//     ⑤폰트 로딩 감지 문자열(BESbswy) ⑥aria-hidden(장식) ⑦position:fixed(클리핑 무관)
//     — 장식용 배경 번짐(blur 원 등)은 텍스트가 없어 정의상 안 걸림.
// 검사 범위: 사이트맵 캐노니컬 <loc> 경로(영어가 최장 텍스트 = 최악 케이스) + /en/inquiry(퍼널,
//     사이트맵 밖). hreflang 변형 전체는 시간 3배라 제외 — ru/kz 고유 잘림은 이 스캔의 표적 밖
//     (긴 단어 오버플로는 nowrap 아닌 word-break 부류라 별도). 뷰포트 = 데스크톱 1440 + 모바일 375.
test("공개 페이지에서 읽을 텍스트가 클리핑 경계에 잘리지 않는다", async ({ browser, request }) => {
  test.setTimeout(600_000);

  const res = await request.get("/sitemap.xml");
  expect(res.ok(), "sitemap.xml 자체가 안 열림").toBeTruthy();
  const xml = await res.text();
  // ⚠️ 사이트맵 <loc>은 6개 언어 변형을 **전부 별도 등재**한다(2026-07-23 실측 194개).
  // 전부 돌면 페이지 로드 ~388회 = 10분 테스트 예산 초과로 이 가드는 태어난 날부터
  // 타임아웃이었다(POSTMORTEMS #112). 원래 설계 의도("영어가 최장 텍스트 = 최악 케이스")
  // 대로 /en 변형만 스캔한다 — 아래 "~66회 페이지 로드" 산정이 이 필터 전제다.
  const paths = [
    ...new Set([
      ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => new URL(m[1]).pathname)
        .filter((p) => p === "/en" || p.startsWith("/en/")),
      "/en/inquiry",
      // /en 변형이 아예 없는 단독 랜딩(1순위 시장, 독립 리뷰 CONFIRMED) — 필터가
      // 영구 제외하면 이 가드가 태어난 이유(#89 러시아어 잘림 부류)를 못 지킨다.
      "/ru/for-russian-patients",
      "/kk/for-kazakh-patients",
    ]),
  ];
  expect(paths.length, "사이트맵 경로가 비정상적으로 적음").toBeGreaterThan(20);


  const failures: string[] = [];
  // 🛑 «못 연 이유»를 반드시 모은다. 예전엔 goto 실패를 조용히 continue 로 넘겨서, 아래 형해화
  //    가드가 걸렸을 때 남는 정보가 「32 < 49」 숫자 두 개뿐이었다 — 어느 페이지가 왜 안 열렸는지
  //    알 길이 없어 6회 연속 빨간불을 아무도 못 읽었다(2026-09-02 규명).
  const unopened: string[] = [];
  let scanned = 0;
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    // 프로덕션(nightly)은 15초로 총예산 방어, 로컬 dev(main push Full E2E)는 라우트별
    // 첫 컴파일이 느려 30초 (독립 리뷰 A1·D3)
    const gotoTimeout = process.env.E2E_SKIP_SERVER === "1" ? 15_000 : 30_000;
    for (const p of paths) {
      // 한 번은 다시 걸어본다. dev 서버는 힙 80% 에 닿으면 «스스로 재시작»하고, 그 순간에 걸린
      // 요청은 즉시 오류를 받는다(playwright.config 의 webServer 주석에 실측이 있다).
      // 이 검사는 전역 재시도를 끈(retries:0) 66회 스윕이라, 재시작 한 번이 남은 페이지를 통째로
      // 쓸어 스캔이 절반으로 줄었다 — 2026-09-01 러너 실측 32/62(내 PC·실서비스에선 62/62 통과).
      let opened = false;
      let lastErr: unknown = null;
      for (const attempt of [0, 1]) {
        try {
          await page.goto(p, { waitUntil: "domcontentloaded", timeout: gotoTimeout });
          opened = true;
          break;
        } catch (e) {
          lastErr = e;
          if (attempt === 0) await page.waitForTimeout(3000); // 재시작이면 몇 초면 다시 뜬다
        }
      }
      if (!opened) {
        // 안 열리는 페이지 «자체»는 sitemap-health 몫 — 여기선 잘림만 본다.
        // 다만 이유는 남긴다(아래 형해화 가드가 걸렸을 때 이게 유일한 단서다).
        unopened.push(
          `[${vp.name}] ${p} — ${String((lastErr as Error)?.message ?? lastErr).split(/\r?\n/)[0]}`
        );
        continue;
      }
      await page.waitForTimeout(1500); // hydration + 데이터 fetch 여유
      // 스캐너 자체의 예외는 삼키지 않는다 — 조용히 죽은 가드 방지 (독립 리뷰 A2)
      const bad = await findClipped(page);
      scanned += 1;
      bad.forEach((b) =>
        failures.push(`[${vp.name}] ${p} — "${b.text}" 이(가) ${b.over}px 잘림 (클리퍼: ${b.clipper})`)
      );
    }
    await ctx.close();
  }

  // 대부분 페이지가 안 열려 스캔이 형해화됐는데 초록으로 끝나는 것 방지 (독립 리뷰 A2)
  expect(
    scanned,
    `스캔된 페이지가 너무 적음 — 가드가 형해화됨. 못 연 ${unopened.length}건:\n${unopened.join("\n")}`
  ).toBeGreaterThanOrEqual(Math.floor(paths.length * 2 * 0.8));

  expect(
    failures,
    `클리핑 경계에 잘리는 텍스트 ${failures.length}건 (flex 자식 min-w-0 누락 부류 — POSTMORTEMS #89):\n${failures.join("\n")}`
  ).toEqual([]);
});
