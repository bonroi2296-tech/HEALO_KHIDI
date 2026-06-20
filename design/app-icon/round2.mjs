// Round 2 — concept-driven marks (not just a font "h").
// Idea: "heal WITH" = 곁에서 함께. The mark should carry meaning, not stamp a letter.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
const TEAL = "#0D9488", WHITE = "#FFFFFF", SLATE = "#475569", MINT = "#5EEAD7";
const DIR = new URL("./svg2/", import.meta.url);
mkdirSync(DIR, { recursive: true });
const SW = 138, cap = `stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const STEM = "M360 224 L360 800";
const ARCH = "M360 502 C360 404 444 390 532 390 C642 390 662 480 662 568 L662 800";

// E1 — "with" companion: a second shorter rounded stroke nests beside the stem inside the
// counter = someone *with* you. (patient + companion). Reads as h; carries togetherness.
function E1(letter, companion) {
  return `<g ${cap}>
    <path d="${STEM}" stroke="${letter}"/>
    <path d="${ARCH}" stroke="${letter}"/>
  </g>
  <path d="M512 612 L512 740" stroke="${companion}" stroke-width="84" stroke-linecap="round" fill="none"/>
  <circle cx="512" cy="556" r="46" fill="${companion}"/>`;
}

// E2 — recovery sprout: two leaves rising in the counter = life/회복 sheltered by the h.
function E2(letter, leaf) {
  const sprout = `
    <path d="M516 720 C516 660 470 632 452 612 C500 612 516 660 516 700 Z" fill="${leaf}"/>
    <path d="M516 720 C516 660 562 632 580 612 C532 612 516 660 516 700 Z" fill="${leaf}"/>`;
  return `<g ${cap}><path d="${STEM}" stroke="${letter}"/><path d="${ARCH}" stroke="${letter}"/></g>${sprout}`;
}

// E3 — "together" embrace: the right leg curls inward at the base = an arm around the shoulder.
function E3(letter) {
  const arch2 = "M360 502 C360 404 444 390 532 390 C642 390 662 480 662 568 L662 712 C662 766 622 792 566 792";
  return `<g ${cap}><path d="${STEM}" stroke="${letter}"/><path d="${arch2}" stroke="${letter}"/></g>`;
}

// E4 — continuous one-stroke h: a single unbroken ribbon = continuity of care, never alone.
function E4(letter) {
  const ribbon = "M360 224 L360 760 M360 512 C360 410 452 392 540 392 C648 392 662 486 662 576 L662 760";
  return `<g ${cap}><path d="${ribbon}" stroke="${letter}"/></g>`;
}

const svg = (inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ""}${inner}</svg>`;

const files = {
  "E1-with-teal.svg": svg(E1(WHITE, MINT), TEAL),
  "E1-with-white.svg": svg(E1(TEAL, SLATE), WHITE),
  "E2-sprout-teal.svg": svg(E2(WHITE, MINT), TEAL),
  "E2-sprout-white.svg": svg(E2(TEAL, "#34D399"), WHITE),
  "E3-embrace-teal.svg": svg(E3(WHITE), TEAL),
  "E3-embrace-white.svg": svg(E3(TEAL), WHITE),
  "E4-ribbon-teal.svg": svg(E4(WHITE), TEAL),
  "E4-ribbon-white.svg": svg(E4(TEAL), WHITE),
};
for (const [n, c] of Object.entries(files)) writeFileSync(new URL(n, DIR), c);

// contact sheet
const render = (s, w) => new Resvg(s, { fitTo: { mode: "width", value: w } }).render().asPng();
const rows = [
  ["E1 — \"with\" companion (곁에 함께)", "E1-with"],
  ["E2 — recovery sprout (회복의 새싹)", "E2-sprout"],
  ["E3 — embrace (감싸안기)", "E3-embrace"],
  ["E4 — one continuous stroke (끊김없는 돌봄)", "E4-ribbon"],
];
const tile = 240, pad = 36, sw = 56;
const cols = [pad, pad + tile + pad, pad + 2 * (tile + pad)];
const W = cols[2] + sw + pad, rowH = tile + 56;
let y = pad + 40, imgs = "";
const di = (base, suf, x, yy, w) => `<image x="${x}" y="${yy}" width="${w}" height="${w}" href="data:image/png;base64,${render(readFileSync(new URL(`${base}-${suf}.svg`, DIR), "utf8"), Math.max(w, 96)).toString("base64")}"/>`;
for (const [title, base] of rows) {
  imgs += di(base, "teal", cols[0], y, tile);
  imgs += di(base, "white", cols[1], y, tile);
  imgs += di(base, "teal", cols[2], y + tile - sw, sw);
  imgs += `<text x="${cols[0]}" y="${y + tile + 32}" font-family="Arial" font-size="19" font-weight="600" fill="#0f172a">${title}</text>`;
  y += rowH;
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y + 10}" viewBox="0 0 ${W} ${y + 10}"><rect width="${W}" height="${y + 10}" fill="#fff"/><text x="${pad}" y="${pad + 8}" font-family="Arial" font-size="27" font-weight="700" fill="#0f172a">healwith — round 2 · 컨셉을 형태에 담음</text><g font-family="Arial" font-size="14" fill="#64748b"><text x="${cols[0]}" y="${pad + 34}">on teal</text><text x="${cols[1]}" y="${pad + 34}">on white</text><text x="${cols[2]}" y="${pad + 34}">48px</text></g>${imgs}</svg>`;
writeFileSync(new URL("../round2-sheet.png", DIR), render(sheet, W * 1.4));
console.log("done");
