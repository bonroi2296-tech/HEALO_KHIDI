/** 받은 로고들을 한 장에 늘어놓아 눈으로 확인한다(밝은 바탕 + 짙은 바탕). */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const L = process.argv[2];
const files = fs.readdirSync(L).filter((f) => /\.(png|svg|jpg)$/i.test(f));

const rows = files
  .map((f) => `<div class="row"><div class="cap">${f}</div><img src="${f}"></div>`)
  .join("");
const dark = files.map((f) => `<img class="d" src="${f}">`).join("");

const html = `<!doctype html><meta charset="utf-8">
<style>
body{margin:0;background:#fff;font:12px system-ui,sans-serif}
.row{padding:14px 16px;border-bottom:1px solid #eee}
.cap{color:#888;margin-bottom:6px}
.row img{max-width:420px;max-height:80px;display:block}
.darkbox{padding:16px;background:#0b332e;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.darkbox img.d{max-width:180px;max-height:40px;filter:brightness(0) invert(1)}
</style>
${rows}
<div class="darkbox">${dark}</div>`;

fs.writeFileSync(path.join(L, "_chk.html"), html, "utf-8");

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 520, height: 900 }, deviceScaleFactor: 2 });
await p.goto("file:///" + path.join(L, "_chk.html").replace(/\\/g, "/"), { waitUntil: "networkidle" });
await p.screenshot({ path: path.join(L, "_chk.png"), fullPage: true });
console.log("확인표 저장: " + files.length + "개");
await b.close();
