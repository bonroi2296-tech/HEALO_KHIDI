/** 패널마다 «어떤 요소와 어떤 요소 사이»가 얼마나 비었는지 잰다. */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const dir = process.argv[3];
const MIN = Number(process.argv[4] || 6); // 몇 mm 이상만 보고할지
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(dir, process.argv[2])).href, { waitUntil: "networkidle" });

const rows = await p.evaluate((MIN) => {
  const MM = 96 / 25.4;
  const name = (e) => {
    if (!e) return "패널 위";
    const t = (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 22);
    return t || `<${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}>`;
  };
  const out = [];
  document.querySelectorAll(".sheet").forEach((sh, si) => {
    sh.querySelectorAll(".panel").forEach((pn, pi) => {
      const pad = pn.querySelector(".pad, .cov");
      if (!pad) return;
      const pb = pad.getBoundingClientRect();
      const kids = [...pad.children].filter((e) => e.getBoundingClientRect().height > 1);
      let prev = null, prevBottom = pb.top;
      kids.forEach((e) => {
        const r = e.getBoundingClientRect();
        const gap = (r.top - prevBottom) / MM;
        if (gap >= MIN) out.push({ 면: si + 1, 칸: pi + 1, mm: +gap.toFixed(1), 위: name(prev), 아래: name(e) });
        prev = e; prevBottom = r.bottom;
      });
      const tail = (pb.bottom - prevBottom) / MM;
      if (tail >= MIN) out.push({ 면: si + 1, 칸: pi + 1, mm: +tail.toFixed(1), 위: name(prev), 아래: "패널 끝" });
    });
  });
  return out.sort((a, b) => b.mm - a.mm);
}, MIN);
await b.close();

console.log(`── ${MIN}mm 이상 벌어진 곳 (넓은 순) ──`);
rows.forEach((r) => console.log(`  ${r.면}면 ${r.칸}칸  ${String(r.mm).padStart(5)}mm   「${r.위}」 ↓ 「${r.아래}」`));
console.log(`\n합계 ${rows.length}곳 · 총 ${rows.reduce((s, r) => s + r.mm, 0).toFixed(1)}mm`);
