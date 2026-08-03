/**
 * healwith: 폰 화면 전수 훑기 (앱이 띄우는 웹을 폰 크기로 자동 점검)
 *
 * 왜 있나 (2026-07-31 PO 지시 «내가 본 것만 고치지 말고 전수조사»):
 *   앱은 healwith.co.kr 를 그대로 띄운다 → 폰에서 보이는 문제 대부분은 «웹을 폰 크기로 열면»
 *   그대로 재현된다. 사람이 폰을 하나하나 눌러보는 대신, 주요 화면을 전부 돌며
 *   기계로 잴 수 있는 것부터 잡는다.
 *
 * 재는 것 (전부 «눈»이 아니라 숫자):
 *   1. 가로로 삐져나감  — 문서 폭 > 화면 폭 (좌우 스크롤이 생기면 폰에서 화면이 흔들린다)
 *   2. 하단 고정 막대에 가림 — 누를 수 있는 것이 하단 탭바/배너 밑에 깔려 «안 눌린다»
 *   3. 화면 밖으로 나간 글자 — 요소가 화면 오른쪽 경계를 넘음
 *   4. 콘솔 오류
 *
 * 쓰는 법: node scripts/mobile-sweep.mjs [기준주소]   (기본 http://localhost:3000)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "mobile-sweep";

// 폰 실측 크기(안드로이드 중형). 앱도 이 폭으로 그린다.
const VIEWPORT = { width: 412, height: 915 };

const ROUTES = (process.env.ROUTES || [
  "/", "/treatments", "/hospitals", "/telemedicine", "/visa", "/insurance",
  "/stories", "/search", "/login", "/signup", "/forgot-password", "/inquiry",
  "/partners", "/terms", "/privacy",
].join(",")).split(",");

/** 한 화면에서 잴 것들 — 브라우저 안에서 도는 순수 계산. */
function measure() {
  const vw = window.innerWidth;
  const problems = [];

  // 1) 가로로 삐져나감
  const docW = document.documentElement.scrollWidth;
  if (docW > vw + 1) problems.push({ kind: "가로삐짐", detail: `문서 ${docW}px > 화면 ${vw}px` });

  // 2) 하단 고정 막대에 가려 «못 누르는» 요소
  //    화면 하단에 붙어 있는(fixed, bottom 근처) 막대들의 윗선을 구한다.
  const bars = [...document.querySelectorAll("body *")].filter((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.height > 24 && r.width > vw * 0.6 && Math.abs(r.bottom - window.innerHeight) < 8;
  });
  const barTop = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().top)) : Infinity;

  if (barTop !== Infinity) {
    const clickable = [...document.querySelectorAll("a,button,input,select,textarea")];
    for (const el of clickable) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.top < window.innerHeight && r.bottom > barTop + 2) {
        // 막대 자신(과 그 안의 버튼)은 제외
        if (bars.some((b) => b.contains(el))) continue;
        problems.push({
          kind: "하단가림",
          detail: `${el.tagName.toLowerCase()}「${(el.innerText || el.value || "").trim().slice(0, 20)}」가 하단 막대(${Math.round(barTop)}px)에 걸림`,
        });
        break; // 화면당 1건만 — 같은 원인이 줄줄이 잡히는 걸 막는다
      }
    }
  }

  // (「오른쪽 경계 넘음」은 뺐다 — 부모가 overflow-hidden 으로 잘라내면 화면상 문제가 아니라
  //  장식용 원·그라데이션이 죄다 잡혔다. 진짜 신호는 위의 «가로삐짐»(문서 폭 자체가 커짐)이다.)

  return problems;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: process.env.LOCALE || "ko-KR",
  colorScheme: process.env.SCHEME === "dark" ? "dark" : "light",
});
// 앱에서는 쿠키 배너가 아예 안 뜬다(isNativeApp 분기) → 배너 때문에 생기는 가짜 「하단가림」을 없앤다.
// COOKIE=show 로 실행하면 «첫 방문자(배너 뜬 상태)»를 그대로 잰다 — 웹 방문자 기준 점검용.
if (process.env.COOKIE !== "show") {
  await context.addInitScript(() => { try { localStorage.setItem("healo_cookie_consent", "all"); } catch {} });
}
const page = await context.newPage();
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const route of ROUTES) {
  const errors = [];
  const onErr = (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); };
  page.on("console", onErr);
  try {
    const res = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200); // 애니메이션·지연 렌더가 끝난 뒤에 잰다
    const status = res ? res.status() : 0;
    let problems = [];
    if (status >= 400) {
      problems = [{ kind: "열림실패", detail: `HTTP ${status}` }];
    } else {
      // 맨 아래까지 내린 상태에서 잰다 — 스크롤로 피할 수 있으면 «가림»이 아니다.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      problems = await page.evaluate(measure);
    }
    await page.screenshot({ path: path.join(OUT, (route === "/" ? "home" : route.replace(/\//g, "_")) + ".png"), fullPage: false });
    report.push({ route, status, problems, errors: errors.slice(0, 3) });
  } catch (e) {
    report.push({ route, status: 0, problems: [{ kind: "열림실패", detail: e.message.slice(0, 80) }], errors });
  }
  page.off("console", onErr);
}
await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
for (const r of report) {
  const tags = r.problems.map((p) => `${p.kind}: ${p.detail}`).join(" | ") || "이상 없음";
  console.log(`${r.status} ${r.route.padEnd(18)} ${tags}${r.errors.length ? `  [콘솔오류 ${r.errors.length}]` : ""}`);
}
