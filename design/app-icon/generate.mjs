// healwith app-icon generator — hand-tuned geometric lowercase "h" monograms.
// Builds 4 concepts × {teal-bg, white-bg, transparent-mark} as SVG, then renders a contact sheet PNG.
// Run: node design/app-icon/generate.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const TEAL = "#0D9488";
const WHITE = "#FFFFFF";
const SLATE = "#475569";

const SVG_DIR = new URL("./svg/", import.meta.url);
const OUT_DIR = new URL("./", import.meta.url);
mkdirSync(SVG_DIR, { recursive: true });

// ---- shared geometry (1024 canvas, mark inside central 80% safe zone) ----
const SW = 140; // stroke width — thick so it survives 48px
const cap = `stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

// Standard humanist lowercase h: tall stem + springing arch + right leg.
const STEM = "M362 232 L362 792";
const ARCH = "M362 500 C362 402 446 388 532 388 C642 388 662 478 662 566 L662 792";

// Concept A — Calm: clean connected rounded h.
function markA(color) {
  return `<g stroke="${color}" ${cap}><path d="${STEM}"/><path d="${ARCH}"/></g>`;
}

// Concept B — Badge: h held inside a soft disc (wholeness / community / care).
// Disc + knockout h (negative space) so the silhouette stays distinct at small sizes.
function markB(discColor, holeIsTransparent, hColor) {
  // when holeIsTransparent: cut the h out of the disc via mask.
  if (holeIsTransparent) {
    return `
    <defs><mask id="bMask">
      <rect width="1024" height="1024" fill="white"/>
      <g stroke="black" ${cap}><path d="${STEM}"/><path d="${ARCH}"/></g>
    </mask></defs>
    <circle cx="512" cy="512" r="362" fill="${discColor}" mask="url(#bMask)"/>`;
  }
  return `
    <circle cx="512" cy="512" r="362" fill="${discColor}"/>
    <g stroke="${hColor}" ${cap}><path d="${STEM}"/><path d="${ARCH}"/></g>`;
}

// Concept C — Shelter (two-tone): arch = warm protective "roof", stem = grounded slate.
function markC(stemColor, archColor) {
  return `<g ${cap}>
    <path d="${STEM}" stroke="${stemColor}"/>
    <path d="${ARCH}" stroke="${archColor}"/>
  </g>`;
}

// Concept D — Human care: the h's counter shelters a small dot = a person being cared for.
function markD(color, dotColor) {
  return `<g stroke="${color}" ${cap}><path d="${STEM}"/><path d="${ARCH}"/></g>
    <circle cx="512" cy="600" r="54" fill="${dotColor}"/>`;
}

function svg(inner, bg) {
  const bgRect = bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
${bgRect}
${inner}
</svg>`;
}

// ---- assemble files ----
const files = {
  // A — Calm
  "healwith-A-calm-teal-bg.svg":   svg(markA(WHITE), TEAL),
  "healwith-A-calm-white-bg.svg":  svg(markA(TEAL), WHITE),
  "healwith-A-calm-mark.svg":      svg(markA(TEAL), null),

  // B — Badge
  "healwith-B-badge-teal-bg.svg":  svg(markB(WHITE, false, TEAL), TEAL),   // white disc, teal knockout h
  "healwith-B-badge-white-bg.svg": svg(markB(TEAL, false, WHITE), WHITE),  // teal disc, white h
  "healwith-B-badge-mark.svg":     svg(markB(TEAL, true), null),           // teal disc, transparent h cut-out

  // C — Shelter (two-tone slate + teal)
  "healwith-C-shelter-white-bg.svg": svg(markC(SLATE, TEAL), WHITE),       // hero two-tone
  "healwith-C-shelter-teal-bg.svg":  svg(markC(WHITE, WHITE), TEAL),       // mono white fallback on dark
  "healwith-C-shelter-mark.svg":     svg(markC(SLATE, TEAL), null),

  // D — Human care
  "healwith-D-human-teal-bg.svg":  svg(markD(WHITE, WHITE), TEAL),
  "healwith-D-human-white-bg.svg": svg(markD(TEAL, TEAL), WHITE),
  "healwith-D-human-mark.svg":     svg(markD(TEAL, TEAL), null),
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, SVG_DIR), content);
}
console.log(`wrote ${Object.keys(files).length} SVGs`);

// ---- contact sheet PNG (each concept: teal-bg, white-bg, and a 48px legibility check) ----
function render(svgStr, width) {
  return new Resvg(svgStr, { fitTo: { mode: "width", value: width } }).render().asPng();
}
// Build an HTML-free composite by tiling rendered PNGs into one SVG via <image> data URIs.
const concepts = [
  ["A — Calm", "healwith-A-calm"],
  ["B — Badge", "healwith-B-badge"],
  ["C — Shelter (two-tone)", "healwith-C-shelter"],
  ["D — Human care", "healwith-D-human"],
];
const tile = 230, pad = 36, label = 46, smallTile = 48;
const colX = [pad, pad + (tile + pad), pad + 2 * (tile + pad), pad + 3 * (tile + pad)];
const rowH = tile + label + pad;
const sheetW = colX[3] + smallTile + pad;
const sheetH = pad + concepts.length * rowH + 40;
let imgs = "";
import { readFileSync } from "node:fs";
function dataImg2(svgName, x, y, w, suffix) {
  const svgStr = readFileSync(new URL(`${svgName}-${suffix}.svg`, SVG_DIR), "utf8");
  const png = render(svgStr, Math.max(w, 96));
  return `<image x="${x}" y="${y}" width="${w}" height="${w}" href="data:image/png;base64,${png.toString("base64")}"/>`;
}
let y = pad + 20;
let header = `<text x="${pad}" y="${pad + 2}" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0f172a">healwith — app icon concepts</text>`;
let colHeads = `<g font-family="Arial, sans-serif" font-size="15" fill="#64748b">
  <text x="${colX[0]}" y="${y - 6}">on teal</text>
  <text x="${colX[1]}" y="${y - 6}">on white</text>
  <text x="${colX[2]}" y="${y - 6}">two-tone / mark</text>
  <text x="${colX[3]}" y="${y - 6}">48px</text>
</g>`;
for (const [title, base] of concepts) {
  imgs += dataImg2(base, colX[0], y, tile, "teal-bg");
  imgs += dataImg2(base, colX[1], y, tile, "white-bg");
  const thirdSuffix = base.includes("shelter") ? "white-bg" : "mark";
  // for mark on transparent, put a light checker bg
  imgs += `<rect x="${colX[2]}" y="${y}" width="${tile}" height="${tile}" fill="#f1f5f9" stroke="#e2e8f0"/>`;
  imgs += dataImg2(base, colX[2], y, tile, base.includes("shelter") ? "mark" : "mark");
  imgs += dataImg2(base, colX[3], y + tile - smallTile, smallTile, "teal-bg");
  imgs += `<text x="${colX[0]}" y="${y + tile + 30}" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#0f172a">${title}</text>`;
  y += rowH;
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">
<rect width="${sheetW}" height="${sheetH}" fill="#ffffff"/>
${header}
${colHeads}
${imgs}
</svg>`;
const sheetPng = render(sheet, sheetW * 1.4);
writeFileSync(new URL("contact-sheet.png", OUT_DIR), sheetPng);
console.log("wrote contact-sheet.png");
