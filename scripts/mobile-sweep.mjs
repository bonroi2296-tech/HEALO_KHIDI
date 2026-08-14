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

// 🔑 «앱인 척» 하고 잰다 (2026-08-14 추가).
// 앱/웹 판정은 오직 브라우저 이름표(user agent)에 `healwith-app` 이 있느냐다(`src/lib/isNativeApp.ts`).
// 그래서 이름표만 붙이면 «앱이 띄우는 화면 그대로»가 재현된다 — 실기기 없이도 앱 화면을 잴 수 있다.
// 웹 방문자 기준으로 재려면 APP=0 으로 실행. 둘은 화면이 «다르므로» 양쪽 다 돌려야 완전하다.
const AS_APP = process.env.APP !== "0";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/127.0.0.0 Mobile Safari/537.36";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: process.env.LOCALE || "ko-KR",
  colorScheme: process.env.SCHEME === "dark" ? "dark" : "light",
  ...(AS_APP ? { userAgent: `${ANDROID_UA} healwith-app` } : {}),
});
console.log(`[모드] ${AS_APP ? "앱(스토어 앱 안에서 보는 화면)" : "웹(브라우저 방문자)"} · ${VIEWPORT.width}x${VIEWPORT.height} · ${BASE}`);
// 앱에서는 쿠키 배너가 아예 안 뜬다(isNativeApp 분기) → 배너 때문에 생기는 가짜 「하단가림」을 없앤다.
// COOKIE=show 로 실행하면 «첫 방문자(배너 뜬 상태)»를 그대로 잰다 — 웹 방문자 기준 점검용.
if (process.env.COOKIE !== "show") {
  await context.addInitScript(() => { try { localStorage.setItem("healo_cookie_consent", "all"); } catch {} });
}
// 바깥 추적·광고 주소는 아예 끊는다 (2026-08-14 추가).
// 왜: 이 PC 는 광고차단기가 구글 측정 주소를 막아 요청이 «영원히 재시도»된다.
// 그러면 「통신이 잠잠해질 때까지」 기다리는 이 도구가 시간초과로 죽어 **멀쩡한 화면 4개를
// 「열림실패」로 잘못 보고**했다(2026-08-14 실측: /hospitals·/telemedicine·/insurance·/search).
// 추적 스크립트는 화면을 그리지 않으므로 끊어도 측정 결과가 달라지지 않는다.
const BLOCK = [/google-analytics\.com/, /googletagmanager\.com/, /www\.google\.com\/g\/collect/, /doubleclick\.net/, /google-analytics/, /analytics\.google\.com/];
await context.route("**/*", (route) => {
  const url = route.request().url();
  if (BLOCK.some((re) => re.test(url))) return route.abort();
  return route.continue();
});
const page = await context.newPage();

// 로그인 뒤 화면을 훑을 때: LOGIN_LINK 로 «임시 입장 링크»를 받아 먼저 들어간다.
// (비밀번호를 치지 않는다 — 서버 열쇠로 만든 1회용 링크다.)
if (process.env.LOGIN_LINK) {
  await page.goto(process.env.LOGIN_LINK, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
}
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const route of ROUTES) {
  const errors = [];
  const onErr = (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); };
  page.on("console", onErr);
  try {
    // ⚠️ waitUntil 을 「통신이 완전히 멈출 때까지(networkidle)」로 두지 마라 (2026-08-14 실측).
    //    챗봇 위젯처럼 «계속 통신하는» 화면은 영영 안 멈춰 시간초과가 나고,
    //    그러면 **멀쩡한 화면이 「열림실패」로 잘못 보고된다**(/hospitals·/telemedicine·/insurance·/search
    //    4개가 실제로 그랬다 — 진짜 브라우저에선 정상이었다).
    const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500); // 애니메이션·지연 렌더가 끝난 뒤에 잰다
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
