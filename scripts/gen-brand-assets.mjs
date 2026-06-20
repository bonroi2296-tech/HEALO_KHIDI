/**
 * healwith 브랜드 자산 생성기 (시안 1 — 투톤 워드마크 기반)
 *
 * 로고 시안 1(public/brand/logos.html)을 확정 적용:
 * - 헤더: 워드마크(heal=teal / with=slate) — components/brand/Logo.jsx 그대로
 * - 앱 아이콘/파비콘: 워드마크의 머리글자 "h" 모노그램(teal 풀블리드) — 자동제작 십자 제거
 * - OG 이미지: 풀 워드마크 "healwith"
 *
 * 실행: node scripts/gen-brand-assets.mjs
 * (sharp 로 SVG → PNG 래스터화. 폰트는 컨테이너의 DejaVu Sans Bold 사용.)
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FONT = "DejaVu Sans, Liberation Sans, sans-serif";

// 앱 아이콘 — 풀블리드 teal 그라데이션 + 흰 "h" (maskable 안전: 배경이 가장자리까지 참)
const iconFull = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#0f766e"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="256" y="266" font-family="${FONT}" font-size="340" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">h</text>
</svg>`;

// 파비콘(브라우저 탭) — 둥근 모서리 버전
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#0f766e"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="256" y="266" font-family="${FONT}" font-size="340" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">h</text>
</svg>`;

// OG 이미지 — 흰 배경 + 투톤 워드마크(시안 1) + 태그라인
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <text x="600" y="300" font-family="${FONT}" font-size="150" font-weight="bold" text-anchor="middle" letter-spacing="-4">
    <tspan fill="#0d9488">heal</tspan><tspan fill="#334155">with</tspan>
  </text>
  <rect x="520" y="356" width="160" height="6" rx="3" fill="#0d9488"/>
  <text x="600" y="430" font-family="${FONT}" font-size="40" fill="#64748b" text-anchor="middle">Korea Cancer Care for International Patients</text>
</svg>`;

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function png(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(ROOT, outPath));
  console.log("✓", outPath);
}

async function main() {
  // 파비콘 SVG (둥근)
  await writeFile(path.join(ROOT, "public/favicon.svg"), faviconSvg);
  console.log("✓ public/favicon.svg");

  // PWA 아이콘들 (풀블리드)
  for (const s of ICON_SIZES) {
    await png(iconFull(512), s, `public/icons/icon-${s}x${s}.png`);
  }
  // apple-touch (180), 파비콘 png (16/32)
  await png(iconFull(512), 180, "public/apple-touch-icon.png");
  await png(iconFull(512), 32, "public/favicon-32x32.png");
  await png(iconFull(512), 16, "public/favicon-16x16.png");

  // OG 이미지 (1200x630)
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(ROOT, "public/og-image.png"));
  console.log("✓ public/og-image.png");
}

main().catch((e) => { console.error(e); process.exit(1); });
