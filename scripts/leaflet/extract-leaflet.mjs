/**
 * 리플렛 HTML → PPTX 조립 재료 추출 (v2 — 전부 «개별 객체»로)
 *
 *  · 색면·카드·원·선  → 도형 정보(JSON)
 *  · 사진·QR·로고     → 잘라낸 PNG 파일 + 좌표
 *  · 아이콘(SVG)      → 배경 투명 PNG + 좌표
 *  · 글자             → 텍스트 블록(JSON)
 *
 * 그리는 순서(z-order)는 DOM 순서를 따른다.
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const dir = process.argv[4];
const src = process.argv[2];
const tag = process.argv[3];
const DPI = 300;
const SCALE = DPI / 96;

const outDir = path.join(dir, `${tag}-parts`);
fs.mkdirSync(outDir, { recursive: true });

const b = await chromium.launch({ args: ["--allow-file-access-from-files", "--font-render-hinting=none"] });
const page = await b.newPage({ deviceScaleFactor: SCALE });
await page.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const data = await page.evaluate(() => {
  const PX_PER_MM = 96 / 25.4;
  const sheets = [...document.querySelectorAll(".sheet")];
  const toPt = (px) => +(parseFloat(px) * 72 / 96).toFixed(2);
  const parseColor = (c) => {
    const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : +m[4];
    if (a === 0) return null;
    const [r, g, bl] = [1, 2, 3].map((i) => Math.round(+m[i]));
    return { hex: [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join(""), a };
  };
  const isBlockish = (el) => {
    const d = getComputedStyle(el).display;
    return d === "block" || d === "flex" || d === "grid" || d === "list-item" || d === "table";
  };

  const shapes = [], images = [], texts = [], icons = [];
  let order = 0;

  sheets.forEach((sheet, si) => {
    const sb = sheet.getBoundingClientRect();
    const mmX = (v) => +((v - sb.left) / PX_PER_MM).toFixed(2);
    const mmY = (v) => +((v - sb.top) / PX_PER_MM).toFixed(2);
    const mmW = (v) => +(v / PX_PER_MM).toFixed(2);

    const all = [sheet, ...sheet.querySelectorAll("*")];
    all.forEach((el) => {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 0.4 || r.height < 0.4) return;
      const z = order++;
      const cls = String(el.className?.baseVal ?? el.className ?? "").slice(0, 48);
      const base = { sheet: si, z, cls, xMm: mmX(r.left), yMm: mmY(r.top), wMm: mmW(r.width), hMm: mmW(r.height) };

      // ── 아이콘(SVG) ───────────────────────────
      if (el.tagName.toLowerCase() === "svg") {
        const id = `icon${icons.length}`;
        el.setAttribute("data-part", id);
        icons.push({ ...base, id });
        return;
      }

      // ── 그림(img) ────────────────────────────
      if (el.tagName === "IMG") {
        const id = `img${images.length}`;
        el.setAttribute("data-part", id);
        images.push({ ...base, id, src: el.getAttribute("src"),
                      radiusMm: mmW(parseFloat(cs.borderTopLeftRadius) || 0),
                      objectFit: cs.objectFit, objectPosition: cs.objectPosition });
        return;
      }

      // ── 배경 그림(css background-image) ───────
      const bgi = cs.backgroundImage;
      if (bgi && bgi !== "none" && (bgi.includes("url(") || bgi.includes("gradient"))) {
        const u = bgi.match(/url\("?([^")]+)"?\)/);
        const id = `img${images.length}`;
        el.setAttribute("data-part", id);
        images.push({ ...base, id, src: u ? u[1] : null, isBg: true, isGrad: bgi.includes("gradient"),
                      radiusMm: mmW(parseFloat(cs.borderTopLeftRadius) || 0),
                      bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition });
        return;
      }

      // ── 색면·카드·원·선 ──────────────────────
      const fill = parseColor(cs.backgroundColor);
      const bw = ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs[`border${s}Width`]) || 0);
      const anyBorder = bw.some((v) => v > 0);
      if (fill || anyBorder) {
        const radius = parseFloat(cs.borderTopLeftRadius) || 0;
        // 모서리가 아무리 둥글어도 «가로세로가 비슷할 때»만 진짜 원이다.
        // 알약 모양(가로가 긴 배지)을 원으로 잡으면 파워포인트에서 타원으로 찌그러진다.
        const isCircle = radius >= Math.min(r.width, r.height) / 2 - 0.6
          && Math.abs(r.width - r.height) < Math.min(r.width, r.height) * 0.18;
        const bc = parseColor(cs.borderTopColor);
        // 한쪽 변에만 테두리가 있으면 «선»으로 따로 그린다(표의 구분선 등)
        const oneSide = anyBorder && bw.filter((v) => v > 0).length === 1;
        if (oneSide) {
          const idx = bw.findIndex((v) => v > 0);
          const side = ["top", "right", "bottom", "left"][idx];
          const lc = parseColor(cs[`border${["Top","Right","Bottom","Left"][idx]}Color`]);
          if (lc) shapes.push({ ...base, kind: "line", side, thickMm: mmW(bw[idx]), color: lc.hex, alpha: lc.a });
          if (fill) shapes.push({ ...base, kind: isCircle ? "oval" : "rect", radiusMm: mmW(radius),
                                  fill: fill.hex, fillAlpha: fill.a, line: null });
          return;
        }
        shapes.push({ ...base, kind: isCircle ? "oval" : "rect", radiusMm: mmW(radius),
                      fill: fill ? fill.hex : null, fillAlpha: fill ? fill.a : 0,
                      line: anyBorder && bc ? { color: bc.hex, alpha: bc.a, thickMm: mmW(bw[0] || bw[3]) } : null });
        return;
      }
    });

    // ── ::before 로 그린 «단계 사이 세로선» ─────
    sheet.querySelectorAll(".step").forEach((st) => {
      const cb = getComputedStyle(st, "::before");
      if (!cb || cb.content === "none") return;
      const col = parseColor(cb.backgroundColor);
      if (!col) return;
      const r = st.getBoundingClientRect();
      const left = parseFloat(cb.left) || 0, top = parseFloat(cb.top) || 0;
      const bottom = parseFloat(cb.bottom) || 0, w = parseFloat(cb.width) || 1;
      shapes.push({ sheet: si, z: order++, cls: "step-line", kind: "rect", radiusMm: 0,
                    xMm: mmX(r.left + left), yMm: mmY(r.top + top),
                    wMm: mmW(w), hMm: mmW(r.height - top - bottom),
                    fill: col.hex, fillAlpha: col.a, line: null });
    });

    // ── 글자 ────────────────────────────────
    sheet.querySelectorAll("*").forEach((el) => {
      if (el.closest("svg")) return;
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasOwnText) return;
      // <br> 은 크로미움에서 display:block 으로 잡힌다 — 줄바꿈일 뿐이니 블록 판정에서 뺀다
      if ([...el.children].some((c) => c.tagName !== "BR" && isBlockish(c))) return;
      if (!isBlockish(el)) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;

      const runs = [];
      const walk = (node, inheritEl) => {
        node.childNodes.forEach((n) => {
          if (n.nodeType === 3) {
            const t = n.textContent.replace(/\s+/g, " ");
            if (!t.trim() && !runs.length) return;
            const s = getComputedStyle(inheritEl);
            const col = parseColor(s.color) || { hex: "000000", a: 1 };
            runs.push({ text: s.textTransform === "uppercase" ? t.toUpperCase() : t,
                        sizePt: toPt(s.fontSize), weight: +s.fontWeight,
                        fam: s.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
                        color: col.hex, alpha: col.a,
                        spcPt: s.letterSpacing === "normal" ? 0 : toPt(s.letterSpacing) });
          } else if (n.nodeType === 1) {
            if (n.tagName === "BR") { runs.push({ br: true }); return; }
            if (n.tagName.toLowerCase() === "svg") return;
            walk(n, n);
          }
        });
      };
      walk(el, el);
      if (!runs.some((x) => x.text && x.text.trim())) return;

      const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const pt2 = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
      const pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
      texts.push({
        sheet: si, z: order++, cls: String(el.className).slice(0, 44),
        xMm: mmX(r.left + pl), yMm: mmY(r.top + pt2),
        wMm: mmW(r.width - pl - pr), hMm: mmW(r.height - pt2 - pb),
        align: cs.textAlign === "start" ? "left" : cs.textAlign,
        lineHeightPt: cs.lineHeight === "normal" ? null : toPt(cs.lineHeight),
        flexJustify: (cs.display === "flex") ? cs.justifyContent : null,
        flexAlign: (cs.display === "flex") ? cs.alignItems : null,
        runs,
      });
    });
  });

  return { shapes, images, texts, icons, sheetCount: sheets.length };
});

// ── 아이콘·그림 조각을 «표식 기준»으로 잘라 낸다 ────────────
for (const ic of data.icons) {
  const h = await page.$(`[data-part="${ic.id}"]`);
  if (h) await h.screenshot({ path: path.join(outDir, `${ic.id}.png`), omitBackground: true });
}
for (const im of data.images) {
  const h = await page.$(`[data-part="${im.id}"]`);
  if (!h) continue;
  if (im.isBg) {
    // 배경(사진·그라데이션)만 남기고 자식은 잠시 숨긴다 — 글자가 두 번 찍히는 것을 막는다
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-part="${id}"]`);
      el.__hidden = [...el.children].map((c) => [c, c.style.visibility]);
      el.__hidden.forEach(([c]) => (c.style.visibility = "hidden"));
    }, im.id);
    await h.screenshot({ path: path.join(outDir, `${im.id}.png`) });
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-part="${id}"]`);
      (el.__hidden || []).forEach(([c, v]) => (c.style.visibility = v));
    }, im.id);
  } else {
    await h.screenshot({ path: path.join(outDir, `${im.id}.png`), omitBackground: true });
  }
}

fs.writeFileSync(path.join(dir, `${tag}-parts.json`), JSON.stringify(data, null, 1), "utf-8");
console.log(`  도형 ${data.shapes.length} · 그림 ${data.images.length} · 아이콘 ${data.icons.length} · 글자 ${data.texts.length}`);
console.log(`  조각 파일 → ${path.basename(outDir)}/`);
await b.close();
