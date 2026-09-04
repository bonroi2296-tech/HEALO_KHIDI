/** 각 기관 공식 사이트에서 로고 이미지 주소를 찾아낸다(내려받지는 않는다). */
import { chromium } from "playwright";

const SITES = [
  ["세브란스", "https://sev.severance.healthcare/sev/index.do"],
  ["이대서울", "https://seoul.eumc.ac.kr/index.do"],
  ["이대목동", "https://mokdong.eumc.ac.kr/index.do"],
  ["고대구로", "https://guro.kumc.or.kr/kr/index.do"],
  ["보건복지부", "https://www.mohw.go.kr/menu.es?mid=a10000000000"],
  ["UMIT", "https://umit.kz/"],
];

const b = await chromium.launch();
for (const [name, url] of SITES) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
    await p.waitForTimeout(2500);
    const found = await p.evaluate(() => {
      const out = [];
      // 머리말 안의 로고를 우선 본다
      const scope = document.querySelector("header, #header, .header, .gnb, .top") || document.body;
      scope.querySelectorAll("img").forEach((im) => {
        const src = im.currentSrc || im.src || "";
        const alt = (im.alt || "") + " " + (im.className || "") + " " + src;
        if (/logo|ci|symbol|bi_/i.test(alt) && src) {
          out.push({ kind: "img", src, w: im.naturalWidth, h: im.naturalHeight, alt: im.alt || "" });
        }
      });
      scope.querySelectorAll("svg").forEach((sv, i) => {
        const cls = String(sv.getAttribute("class") || "") + " " + String(sv.parentElement?.className || "");
        if (/logo|ci|symbol/i.test(cls)) out.push({ kind: "svg", idx: i, cls: cls.slice(0, 50) });
      });
      // 배경 이미지로 된 로고
      scope.querySelectorAll("a,div,h1,span").forEach((el) => {
        const cls = String(el.className || "") + " " + String(el.id || "");
        if (!/logo|ci\b|symbol/i.test(cls)) return;
        const bg = getComputedStyle(el).backgroundImage;
        const m = bg && bg.match(/url\("?([^")]+)"?\)/);
        if (m) out.push({ kind: "bg", src: m[1], cls: cls.slice(0, 40) });
      });
      return out.slice(0, 8);
    });
    console.log(`\n[${name}] ${url}`);
    if (!found.length) console.log("   (로고 후보 못 찾음)");
    found.forEach((f) => console.log("   " + JSON.stringify(f)));
  } catch (e) {
    console.log(`\n[${name}] 실패: ${e.message.slice(0, 70)}`);
  }
  await p.close();
}
await b.close();
