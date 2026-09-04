import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
const dir = process.argv[4];
const src = process.argv[2], tag = process.argv[3];
const b = await chromium.launch({ args: ["--allow-file-access-from-files", "--font-render-hinting=none"] });
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const st = await p.evaluate(() => ({ n: document.images.length,
  bad: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute("src")),
  faces: [...document.fonts].map(f => `${f.family}${f.weight}:${f.status}`).join(" ") }));
console.log(st.bad.length ? "  [X] 그림 로드 실패: " + st.bad.join(", ") : "  [OK] 그림 " + st.n + "개 로드");
console.log("  글꼴: " + st.faces);
const ov = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll(".panel").forEach((pn, i) => {
    const pad = pn.querySelector(".pad, .cov"); if (!pad) return;
    const o = pad.scrollHeight - pad.clientHeight;
    if (o > 1) out.push(`패널${i + 1} ${o}px 넘침`);
    const pb = pad.getBoundingClientRect();
    pad.querySelectorAll("*").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height && r.bottom > pb.bottom + 1) out.push(`패널${i+1} ${String(el.className).slice(0,22)} ${Math.round(r.bottom-pb.bottom)}px 밖`);
    });
  });
  return [...new Set(out)];
});
console.log(ov.length ? "  [넘침] " + ov.join(" / ") : "  [OK] 넘침 없음");
const sh = await p.$$(".sheet");
for (let i = 0; i < sh.length; i++) await sh[i].screenshot({ path: path.join(dir, `${tag}-p${i + 1}.png`) });
await p.pdf({ path: path.join(dir, `${tag}.pdf`), width: `${303/25.4}in`, height: `${216/25.4}in`, printBackground: true, pageRanges: "1-2" });
console.log("  → " + tag + ".pdf");
await b.close();
