// 앱 아이콘 일괄 생성: 소스 1장 → PWA·파비콘·iOS·Android(적응형) 전부.
// 소스: icons/icon.png (정사각 1024+ 권장, PO가 교체하는 파일).
// 재실행: node scripts/gen-app-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SRC = "icons/icon.png";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function icon(size, path) {
  await mkdir(dirname(path), { recursive: true });
  // flatten: 소스에 투명이 있어도 흰 배경으로 — 아이콘은 불투명해야 함
  await sharp(SRC).resize(size, size, { fit: "cover" }).flatten({ background: WHITE }).png().toFile(path);
  console.log(`✓ ${path} (${size}²)`);
}
async function solid(size, path, bg = WHITE) {
  await mkdir(dirname(path), { recursive: true });
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } }).png().toFile(path);
  console.log(`✓ ${path} (${size}² solid)`);
}

// ── 1) PWA (public/icons/icon-NxN.png) ──
for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) {
  await icon(s, `public/icons/icon-${s}x${s}.png`);
}
// ── 2) 파비콘 + apple-touch (public/) ──
await icon(180, "public/apple-touch-icon.png");
await icon(32, "public/favicon-32x32.png");
await icon(16, "public/favicon-16x16.png");

// ── 3) iOS (단일 1024 앱아이콘) ──
await icon(1024, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");

// ── 4) Android (밀도별 레거시 + 적응형 foreground/background) ──
const DENS = {
  ldpi:    { legacy: 36,  adaptive: 81 },
  mdpi:    { legacy: 48,  adaptive: 108 },
  hdpi:    { legacy: 72,  adaptive: 162 },
  xhdpi:   { legacy: 96,  adaptive: 216 },
  xxhdpi:  { legacy: 144, adaptive: 324 },
  xxxhdpi: { legacy: 192, adaptive: 432 },
};
for (const [d, { legacy, adaptive }] of Object.entries(DENS)) {
  const base = `android/app/src/main/res/mipmap-${d}`;
  await icon(legacy, `${base}/ic_launcher.png`);
  await icon(legacy, `${base}/ic_launcher_round.png`);
  // 적응형: 흰 배경 위에 아이콘(소스가 이미 여백 있는 라운드 사각형이라 마스킹돼도 안전)
  await icon(adaptive, `${base}/ic_launcher_foreground.png`);
  await solid(adaptive, `${base}/ic_launcher_background.png`);
}

console.log("\n완료 — 소스:", SRC);
