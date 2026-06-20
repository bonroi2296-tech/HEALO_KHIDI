// Round 3 — a properly *designed* letterform, not a font "h".
// Construction: circle-based geometric h. Arch = true semicircle (R=145), pill terminals,
// counter width tuned to match stem weight (optical balance). Filled primitives → clean union.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
const TEAL = "#0D9488", WHITE = "#FFFFFF", SLATE = "#475569", DEEP = "#0B5C56";
const DIR = new URL("./svg3/", import.meta.url);
mkdirSync(DIR, { recursive: true });

// geometry — clear tall ascender (so it reads "h" not "n"), flat humanist shoulder, balanced counter
const STEM = { x: 293, y: 175, w: 148, h: 674, r: 74 };  // ascender clearly dominates
const LEG = { x: 583, y: 495, w: 148, h: 354, r: 74 };
const ARCH = "M367 495 C367 405 430 375 512 375 C594 375 657 405 657 495"; // flat-topped shoulder
const AW = 148;

// the letterform, optionally two-tone (stem color vs bowl color)
function H(stemC, bowlC = stemC) {
  return `
  <rect x="${STEM.x}" y="${STEM.y}" width="${STEM.w}" height="${STEM.h}" rx="${STEM.r}" fill="${stemC}"/>
  <path d="${ARCH}" fill="none" stroke="${bowlC}" stroke-width="${AW}" stroke-linecap="round"/>
  <rect x="${LEG.x}" y="${LEG.y}" width="${LEG.w}" height="${LEG.h}" rx="${LEG.r}" fill="${bowlC}"/>`;
}

// squircle (iOS-ish superellipse) path for the app-tile mock
function squircle(n = 1024, m = 0) {
  const a = n / 2, r = a - m, k = 0.18 * n; // corner pull
  return `M${m + k} ${m} L${n - m - k} ${m} Q${n - m} ${m} ${n - m} ${m + k} L${n - m} ${n - m - k} Q${n - m} ${n - m} ${n - m - k} ${n - m} L${m + k} ${n - m} Q${m} ${n - m} ${m} ${n - m - k} L${m} ${m + k} Q${m} ${m} ${m + k} ${m} Z`;
}

const svg = (inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ""}${inner}</svg>`;
const svgSquircle = (inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><path d="${squircle(1024)}" fill="${bg}"/>${inner}</svg>`;

const files = {
  "h-white-on-teal.svg": svg(H(WHITE), TEAL),
  "h-teal-on-white.svg": svg(H(TEAL), WHITE),
  "h-twotone-on-white.svg": svg(H(SLATE, TEAL), WHITE),       // grounded slate stem, teal bowl
  "h-twotone-on-teal.svg": svg(H(WHITE, "#A7F3E4"), TEAL),    // subtle tonal depth on teal
  "h-mark-teal.svg": svg(H(TEAL), null),
  "h-mark-white.svg": svg(H(WHITE), null),
  "h-tile-teal.svg": svgSquircle(H(WHITE), TEAL),             // app-tile context
  "h-tile-white.svg": svgSquircle(H(TEAL), WHITE),
};
for (const [n, c] of Object.entries(files)) writeFileSync(new URL(n, DIR), c);

// presentation sheet — confident, big
const render = (s, w) => new Resvg(s, { fitTo: { mode: "width", value: w } }).render().asPng();
const di = (file, x, y, w) => `<image x="${x}" y="${y}" width="${w}" height="${w}" href="data:image/png;base64,${render(readFileSync(new URL(file, DIR), "utf8"), Math.max(w, 96)).toString("base64")}"/>`;
const pad = 40, hero = 360, sm = 200, gap = 32;
const W = pad + hero + gap + sm + gap + sm + pad;
let imgs = "";
// hero (white on teal tile)
imgs += di("h-tile-teal.svg", pad, 120, hero);
imgs += `<text x="${pad}" y="${120 + hero + 34}" font-family="Arial" font-size="20" font-weight="600" fill="#0f172a">white · teal tile</text>`;
// right column treatments
const cx = pad + hero + gap;
imgs += di("h-tile-white.svg", cx, 120, sm);
imgs += `<text x="${cx}" y="${120 + sm + 26}" font-family="Arial" font-size="15" fill="#334155">teal · white tile</text>`;
imgs += di("h-twotone-on-white.svg", cx + sm + gap, 120, sm);
imgs += `<text x="${cx + sm + gap}" y="${120 + sm + 26}" font-family="Arial" font-size="15" fill="#334155">two-tone (slate+teal)</text>`;
imgs += di("h-teal-on-white.svg", cx, 120 + sm + 56, sm);
imgs += `<text x="${cx}" y="${120 + sm + 56 + sm + 26}" font-family="Arial" font-size="15" fill="#334155">teal mark</text>`;
// 48px row
imgs += di("h-white-on-teal.svg", cx + sm + gap, 120 + sm + 56, 64);
imgs += di("h-white-on-teal.svg", cx + sm + gap + 80, 120 + sm + 56 + 64 - 40, 40);
imgs += `<text x="${cx + sm + gap}" y="${120 + sm + 56 + 64 + 26}" font-family="Arial" font-size="15" fill="#334155">48 / 64px</text>`;
const H2 = 120 + hero + 70;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H2}" viewBox="0 0 ${W} ${H2}"><rect width="${W}" height="${H2}" fill="#f8fafc"/>
<text x="${pad}" y="56" font-family="Arial" font-size="30" font-weight="700" fill="#0f172a">healwith — round 3</text>
<text x="${pad}" y="88" font-family="Arial" font-size="17" fill="#64748b">원(circle) 기반 기하학적 레터폼 · 정밀 아치 · 옵티컬 밸런스</text>
${imgs}</svg>`;
writeFileSync(new URL("../round3-sheet.png", DIR), render(sheet, W * 1.5));
console.log("done");
