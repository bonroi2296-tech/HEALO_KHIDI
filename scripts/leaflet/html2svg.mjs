/**
 * 리플렛 HTML → 편집 가능한 SVG (일러스트레이터·잉크스케이프에서 그대로 열린다)
 *   · 글자   → <text>  (줄 단위로 위치를 실측해 배치. 글꼴·크기·자간·색 유지)
 *   · 도형   → <rect rx> / <ellipse>
 *   · 그림   → <image>  (base64 로 파일 안에 박는다 — 링크 깨짐 방지)
 *   · 아이콘 → 원본 인라인 SVG 를 그대로 옮겨 심는다 (벡터 유지)
 *
 *   쓰기: node html2svg.mjs <ko.html|ru.html> <ko|ru> <작업폴더>
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const src = process.argv[2], tag = process.argv[3], dir = process.argv[4];

const b = await chromium.launch({ args: ["--allow-file-access-from-files", "--font-render-hinting=none"] });
const p = await b.newPage({ deviceScaleFactor: 2 });
await p.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);

const sheets = await p.evaluate(() => {
  const PX = 96 / 25.4;
  const mm = (v) => +(v / PX).toFixed(3);
  const hex = (c) => {
    const m = String(c).match(/[\d.]+/g);
    if (!m) return { hex: "#000000", a: 0 };
    const [r, g, bl, a = 1] = m.map(Number);
    return { hex: "#" + [r, g, bl].map((x) => Math.round(x).toString(16).padStart(2, "0")).join(""), a: +a };
  };
  const out = [];

  document.querySelectorAll(".sheet").forEach((sheet) => {
    const sb = sheet.getBoundingClientRect();
    const X = (v) => mm(v - sb.left), Y = (v) => mm(v - sb.top);
    const items = [];

    const walk = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;

      // ── 아이콘: 원본 SVG 를 통째로
      if (el.tagName.toLowerCase() === "svg") {
        const c = el.cloneNode(true);
        c.setAttribute("fill", cs.fill);
        c.setAttribute("stroke", cs.stroke);
        c.setAttribute("stroke-width", String(cs.strokeWidth || "1.8").replace("px", ""));
        c.setAttribute("stroke-linecap", cs.strokeLinecap || "round");
        c.setAttribute("stroke-linejoin", cs.strokeLinejoin || "round");
        c.removeAttribute("class");
        c.removeAttribute("style");
        c.setAttribute("x", X(r.left));
        c.setAttribute("y", Y(r.top));
        c.setAttribute("width", mm(r.width));
        c.setAttribute("height", mm(r.height));
        items.push({ kind: "svg", xml: c.outerHTML });
        return;
      }

      // ── 그림
      if (el.tagName.toLowerCase() === "img") {
        items.push({ kind: "img", src: el.getAttribute("src"),
                     x: X(r.left), y: Y(r.top), w: mm(r.width), h: mm(r.height),
                     fit: cs.objectFit });
        return;
      }

      // ── 바탕·테두리
      const bg = hex(cs.backgroundColor);
      const grad = String(cs.backgroundImage).startsWith("linear-gradient");
      const bd = ["Top", "Right", "Bottom", "Left"].map((s) => ({
        w: parseFloat(cs["border" + s + "Width"]) || 0, c: hex(cs["border" + s + "Color"]), side: s.toLowerCase(),
      }));
      const on = bd.filter((v) => v.w > 0 && v.c.a > 0.01);
      const 사방 = on.length === 4 && on.every((v) => v.w === on[0].w && v.c.hex === on[0].c.hex);
      if (bg.a > 0.01 || 사방 || grad) {
        const radPx = parseFloat(cs.borderTopLeftRadius) || 0;
        const round = radPx >= Math.min(r.width, r.height) / 2 - 0.6
                   && Math.abs(r.width - r.height) < Math.min(r.width, r.height) * 0.18;
        items.push({ kind: round ? "ellipse" : "rect",
                     x: X(r.left), y: Y(r.top), w: mm(r.width), h: mm(r.height), rx: mm(radPx),
                     fill: grad ? "GRAD" : (bg.a > 0.01 ? bg.hex : null), fillA: bg.a,
                     stroke: 사방 ? on[0].c.hex : null, strokeW: 사방 ? mm(on[0].w) : 0 });
      }
      // 한 면에만 있는 선(구분선)은 그 자리에 «선 하나»로만 그린다
      if (!사방) on.forEach((v) => {
        const t = Math.max(mm(v.w), 0.08);
        const box = v.side === "top"    ? [X(r.left), Y(r.top), mm(r.width), t]
                  : v.side === "bottom" ? [X(r.left), Y(r.bottom) - t, mm(r.width), t]
                  : v.side === "left"   ? [X(r.left), Y(r.top), t, mm(r.height)]
                  :                       [X(r.right) - t, Y(r.top), t, mm(r.height)];
        items.push({ kind: "rect", x: box[0], y: box[1], w: box[2], h: box[3], rx: 0,
                     fill: v.c.hex, fillA: v.c.a, stroke: null, strokeW: 0 });
      });

      // ── 글자: 이 요소가 직접 가진 글자만, 줄 단위로 실측
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      if (direct.length) {
        const col = hex(cs.color);
        const sizePt = +(parseFloat(cs.fontSize) * 72 / 96).toFixed(2);
        const spcPx = parseFloat(cs.letterSpacing) || 0;
        const anchor = cs.textAlign === "center" ? "middle" : cs.textAlign === "right" ? "end" : "start";
        direct.forEach((node) => {
          const txt = node.textContent;
          const rng = document.createRange();
          const lines = [];
          let cur = null;
          for (let i = 0; i < txt.length; i++) {
            rng.setStart(node, i); rng.setEnd(node, i + 1);
            const cr = rng.getBoundingClientRect();
            if (!cr.width && !cr.height) continue;
            if (!cur || Math.abs(cr.top - cur.top) > 1.5) {
              cur = { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right, s: "" };
              lines.push(cur);
            }
            cur.s += txt[i];
            cur.right = cr.right;
            cur.bottom = Math.max(cur.bottom, cr.bottom);
          }
          lines.forEach((ln) => {
            const s = ln.s.trim();
            if (!s) return;
            const base = ln.bottom - (ln.bottom - ln.top) * 0.21;   // 기준선
            const ax = anchor === "middle" ? (ln.left + ln.right) / 2 : anchor === "end" ? ln.right : ln.left;
            items.push({ kind: "text", x: X(ax), y: Y(base), s,
                         sizeMm: +(sizePt * 0.352778).toFixed(3), weight: cs.fontWeight,
                         fill: col.hex, fillA: col.a, spc: +(spcPx / PX).toFixed(3), anchor });
          });
        });
      }
      [...el.children].forEach(walk);
    };

    [...sheet.children].forEach(walk);
    out.push({ w: mm(sb.width), h: mm(sb.height), items });
  });
  return out;
});
await b.close();

const cache = new Map();
const enc = (rel) => {
  if (cache.has(rel)) return cache.get(rel);
  const f = path.join(dir, rel);
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : "image/" + ext;
  const v = "data:" + mime + ";base64," + fs.readFileSync(f).toString("base64");
  cache.set(rel, v);
  return v;
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const names = [];
sheets.forEach((sh, si) => {
  const body = sh.items.map((it) => {
    if (it.kind === "rect")
      return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"${it.rx ? ` rx="${it.rx}"` : ""}`
        + ` fill="${it.fill === "GRAD" ? `url(#grad${si})` : (it.fill || "none")}"`
        + (it.fill && it.fill !== "GRAD" && it.fillA < 1 ? ` fill-opacity="${it.fillA}"` : "")
        + (it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeW}"` : "") + `/>`;
    if (it.kind === "ellipse")
      return `<ellipse cx="${(it.x + it.w / 2).toFixed(3)}" cy="${(it.y + it.h / 2).toFixed(3)}"`
        + ` rx="${(it.w / 2).toFixed(3)}" ry="${(it.h / 2).toFixed(3)}" fill="${it.fill || "none"}"`
        + (it.fillA < 1 ? ` fill-opacity="${it.fillA}"` : "")
        + (it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeW}"` : "") + `/>`;
    if (it.kind === "img")
      return `<image x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"`
        + ` preserveAspectRatio="${it.fit === "cover" ? "xMidYMin slice" : "none"}" href="${enc(it.src)}"/>`;
    if (it.kind === "svg") return it.xml;
    if (it.kind === "text")
      return `<text x="${it.x}" y="${it.y}" font-family="Pretendard, sans-serif" font-size="${it.sizeMm}"`
        + ` font-weight="${it.weight}" fill="${it.fill}"`
        + (it.fillA < 1 ? ` fill-opacity="${it.fillA}"` : "")
        + (it.spc ? ` letter-spacing="${it.spc}"` : "")
        + (it.anchor !== "start" ? ` text-anchor="${it.anchor}"` : "")
        + `>${esc(it.s)}</text>`;
    return "";
  }).join("\n");

  const defs = `<defs><linearGradient id="grad${si}" x1="0" y1="0" x2="0.36" y2="1">`
    + `<stop offset="0" stop-color="#0e3b35"/><stop offset="0.55" stop-color="#0b332e"/>`
    + `<stop offset="1" stop-color="#082722"/></linearGradient></defs>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sh.w}mm" height="${sh.h}mm"`
    + ` viewBox="0 0 ${sh.w} ${sh.h}">\n${defs}\n${body}\n</svg>`;

  const name = `${tag}-${si === 0 ? "겉면" : "안쪽"}.svg`;
  fs.writeFileSync(path.join(dir, name), svg, "utf-8");
  names.push(name);
  console.log(`  ${name}  요소 ${sh.items.length}개 · ${(Buffer.byteLength(svg) / 1024 / 1024).toFixed(2)} MB`);
});
