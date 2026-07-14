import { test, expect } from "@playwright/test";

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
  const paths = [
    ...new Set([
      ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname),
      "/en/inquiry",
    ]),
  ];
  expect(paths.length, "사이트맵 경로가 비정상적으로 적음").toBeGreaterThan(20);

  const scanner = () => {
    const bad: { text: string; over: number; clipper: string }[] = [];
    const isClipper = (el: Element) => {
      const o = getComputedStyle(el).overflowX;
      return o === "hidden" || o === "clip";
    };
    document.querySelectorAll("body *").forEach((el) => {
      const hasOwnText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim()
      );
      if (!hasOwnText) return;
      const txt = (el.textContent || "").trim();
      if (/^BESbswy/.test(txt)) return; // 폰트 로딩 감지 프로브
      if (el.closest(".gm-style") || el.closest('[aria-hidden="true"]')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // 가장 가까운 가로 클리핑 조상까지 올라가며 의도 패턴이면 중단
      let node: Element | null = el;
      let clipper: Element | null = null;
      while (node && node !== document.body) {
        const cls = typeof node.className === "string" ? node.className : "";
        if (/truncate|line-clamp|sr-only/.test(cls)) return;
        const cs = getComputedStyle(node);
        if (cs.transform !== "none") return; // 캐러셀/애니메이션 계열
        if (cs.position === "fixed") return;
        if (node !== el && isClipper(node)) {
          clipper = node;
          break;
        }
        node = node.parentElement;
      }
      // 잘림은 두 형태: ①요소 상자가 경계를 넘음(rect) ②nowrap 텍스트가 자기 상자 안에서
      // 옆으로 흘러넘침(ink overflow — rect는 안 넘지만 글자는 밖에 그려져 잘림). ②는
      // scrollWidth로 본다(자신이 클리퍼면 자기 설계로 숨긴 것이라 제외).
      const inkRight = !isClipper(el) ? r.left + el.scrollWidth : r.right;
      const effRight = Math.max(r.right, inkRight);
      // 중간 클리퍼가 없어도 body/html이 전역 overflow-x hidden(healo-tokens.css 모바일
      // 수평스크롤 방지) → 뷰포트 가장자리가 곧 클리핑 경계다 (독립 리뷰 C1 지적)
      let over: number;
      let clipperLabel: string;
      if (clipper) {
        const cr = clipper.getBoundingClientRect();
        over = Math.max(effRight - cr.right, cr.left - r.left);
        clipperLabel = (typeof clipper.className === "string" ? clipper.className : "").slice(0, 60);
      } else {
        over = Math.max(effRight - document.documentElement.clientWidth, -r.left);
        clipperLabel = "(viewport — body overflow-x hidden)";
      }
      if (over > 4) {
        bad.push({
          text: txt.replace(/\s+/g, " ").slice(0, 50),
          over: Math.round(over),
          clipper: clipperLabel,
        });
      }
    });
    return bad;
  };

  const failures: string[] = [];
  let scanned = 0;
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    for (const p of paths) {
      try {
        // 15초: 느린 밤에 66회 로드가 600초 예산을 못 넘게 (독립 리뷰 A1)
        await page.goto(p, { waitUntil: "domcontentloaded", timeout: 15_000 });
      } catch {
        continue; // 안 열리는 페이지는 sitemap-health 몫 — 여기선 잘림만 본다
      }
      await page.waitForTimeout(1500); // hydration + 데이터 fetch 여유
      // 스캐너 자체의 예외는 삼키지 않는다 — 조용히 죽은 가드 방지 (독립 리뷰 A2)
      const bad = await page.evaluate(scanner);
      scanned += 1;
      bad.forEach((b) =>
        failures.push(`[${vp.name}] ${p} — "${b.text}" 이(가) ${b.over}px 잘림 (클리퍼: ${b.clipper})`)
      );
    }
    await ctx.close();
  }

  // 대부분 페이지가 안 열려 스캔이 형해화됐는데 초록으로 끝나는 것 방지 (독립 리뷰 A2)
  expect(scanned, "스캔된 페이지가 너무 적음 — 가드가 형해화됨").toBeGreaterThanOrEqual(
    Math.floor(paths.length * 2 * 0.8)
  );

  expect(
    failures,
    `클리핑 경계에 잘리는 텍스트 ${failures.length}건 (flex 자식 min-w-0 누락 부류 — POSTMORTEMS #89):\n${failures.join("\n")}`
  ).toEqual([]);
});
