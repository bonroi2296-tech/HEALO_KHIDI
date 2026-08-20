/**
 * healwith: 폰 화면 전수 훑기 v2 — 「화면 전체」를 찍는다.
 *
 * v1 의 잘못(PO 지적 2026-07-31): 재기 위해 맨 아래로 내린 «그 상태»로 사진을 찍어서
 * 죄다 푸터만 나왔다. 사진이 아무것도 증명하지 못했다.
 * → 이제 ①맨 위로 올려 «화면 전체»(fullPage)를 찍고 ②그 다음 맨 아래로 내려 «가림»을 잰다.
 *
 * 쓰는 법:
 *   node sweep-all.mjs <기준주소> <저장폴더> <주소목록파일> [세션파일]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2];
const OUT = process.argv[3];
const ROUTES = fs.readFileSync(process.argv[4], "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const SESSION = process.argv[5];
const REF = "hvwwlkawaxabhtumjhrg";

function measure() {
  const vw = window.innerWidth;
  const problems = [];
  const docW = document.documentElement.scrollWidth;
  if (docW > vw + 1) problems.push({ kind: "가로삐짐", detail: `문서 ${docW}px > 화면 ${vw}px` });

  const bars = [...document.querySelectorAll("body *")].filter((el) => {
    const s = getComputedStyle(el);
    if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.height > 24 && r.height < window.innerHeight * 0.4 && r.width > vw * 0.6
      && Math.abs(r.bottom - window.innerHeight) < 8;
  });
  const barTop = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().top)) : Infinity;
  if (barTop !== Infinity) {
    for (const el of document.querySelectorAll("a,button,input,select,textarea")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.opacity === "0" || cs.visibility === "hidden" || cs.clipPath === "inset(50%)") continue;
      if (!(el.innerText || el.value || el.getAttribute("aria-label") || "").trim()) continue;
      if (r.top < window.innerHeight && r.bottom > barTop + 2 && !bars.some((b) => b.contains(el))) {
        problems.push({ kind: "하단가림", detail: `${el.tagName.toLowerCase()}「${(el.innerText || el.value || "").trim().slice(0, 24)}」` });
        break;
      }
    }
  }
  // 빈 화면 판정 — 본문 글자가 거의 없으면 «안 그려졌다»는 신호
  const textLen = (document.querySelector("main")?.innerText || document.body.innerText || "").trim().length;
  if (textLen < 40) problems.push({ kind: "내용없음", detail: `본문 글자 ${textLen}자` });
  return problems;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 1,
  isMobile: true, hasTouch: true, locale: "ko-KR",
});
if (SESSION) {
  const sess = JSON.parse(fs.readFileSync(SESSION, "utf8"));
  const raw = "base64-" + Buffer.from(JSON.stringify(sess)).toString("base64url");
  const C = 3180;
  const parts = raw.length <= C ? [{ name: `sb-${REF}-auth-token`, value: raw }]
    : Array.from({ length: Math.ceil(raw.length / C) }, (_, n) => ({ name: `sb-${REF}-auth-token.${n}`, value: raw.slice(n * C, (n + 1) * C) }));
  const host = new URL(BASE).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  await context.addCookies(parts.map((k) => ({ ...k, domain: host, path: "/", httpOnly: false, secure: !isLocal, sameSite: "Lax" })));
}
await context.addInitScript(() => { try { localStorage.setItem("healo_cookie_consent", "all"); } catch {} });
const page = await context.newPage();
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const route of ROUTES) {
  const errors = [];
  const onErr = (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 100)); };
  page.on("console", onErr);
  const name = (route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_"));
  try {
    const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(2600);
    const status = res ? res.status() : 0;
    const finalUrl = page.url().replace(BASE, "");
    // ① 화면 전체 사진 (맨 위 상태)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
    // ② 맨 아래로 내려서 «가림» 측정
    let problems = [];
    if (status >= 400) problems = [{ kind: "열림실패", detail: `HTTP ${status}` }];
    else {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      problems = await page.evaluate(measure);
    }
    report.push({ route, finalUrl, status, problems, errors: errors.slice(0, 2) });
  } catch (e) {
    report.push({ route, finalUrl: "", status: 0, problems: [{ kind: "열림실패", detail: e.message.slice(0, 60) }], errors });
  }
  page.off("console", onErr);
}
await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
for (const r of report) {
  const redirected = r.finalUrl && r.finalUrl !== r.route ? ` →${r.finalUrl}` : "";
  const tags = r.problems.map((p) => `${p.kind}:${p.detail}`).join(" | ");
  if (tags || redirected) console.log(`${r.status} ${r.route}${redirected}  ${tags}`);
}
console.log(`\n총 ${report.length}개 · 이상 있는 것 ${report.filter((r) => r.problems.length).length}개`);
