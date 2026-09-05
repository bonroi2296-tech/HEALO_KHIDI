/** 리플렛 안의 아이콘을 «실제 화면에서» 라벨과 짝지어 세고, 겹치는 것을 찾는다. */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const dir = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
await p.goto(pathToFileURL(path.join(dir, process.argv[2])).href, { waitUntil: "networkidle" });

const rows = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll("svg").forEach((sv) => {
    // 그 아이콘이 속한 «칸»을 위로 거슬러 찾는다
    let box = sv.parentElement;
    while (box && !/\b(cell|feat|tile|step|chk|pill|cta|strip)\b/.test(box.className || "")) box = box.parentElement;
    if (!box) box = sv.parentElement;
    const txt = (box.innerText || "").replace(/\s+/g, " ").trim().slice(0, 34);
    // 모양은 path 의 d 를 다 이어붙여 지문으로 삼는다
    const key = [...sv.querySelectorAll("path,circle,rect,line")]
      .map((e) => e.getAttribute("d") || `${e.tagName}:${e.getAttribute("cx")},${e.getAttribute("cy")},${e.getAttribute("r")}`)
      .join("|");
    const r = sv.getBoundingClientRect();
    out.push({ key, txt, panel: Math.floor(r.left / 380) + 1 });
  });
  return out;
});
await b.close();

const cnt = new Map();
rows.forEach((r) => cnt.set(r.key, (cnt.get(r.key) || 0) + 1));
const seen = new Map();
let n = 0;
console.log("── 두 번 이상 쓰인 아이콘 ──");
for (const [key, c] of [...cnt.entries()].sort((a, b) => b[1] - a[1])) {
  if (c < 2) continue;
  n++;
  const who = rows.filter((r) => r.key === key).map((r) => `${r.panel}면 「${r.txt}」`);
  console.log(`  ${c}번 : ${who.join("  /  ")}`);
}
if (!n) console.log("  없음");
console.log(`\n아이콘 총 ${rows.length}개 · 서로 다른 모양 ${cnt.size}개`);
