/**
 * healwith 워드마크(시안1) → 벡터 SVG 로고 생성
 *
 * 글자를 path로 구워(fontkit) 폰트 의존 없이 어디서나 동일하게 렌더.
 * 시안1 색 그대로: heal=#0d9488 / with=#334155 (다크용: #2dd4bf / #e2e8f0)
 * 결과: public/brand/wordmark.svg (밝은 배경), public/brand/wordmark-dark.svg (어두운 배경)
 *
 * 실행: node scripts/gen-wordmark.mjs
 */
import * as fontkit from "fontkit";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const TEXT = "healwith";
const SPLIT = 4; // "heal" | "with"

function buildWordmark({ healColor, withColor }) {
  const font = fontkit.openSync(FONT_PATH);
  const run = font.layout(TEXT);

  let penX = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const paths = [];

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.toSVG();
    const color = i < SPLIT ? healColor : withColor;
    // 글자: translate(penX) scale(1,-1) — 폰트 y-up → SVG y-down 뒤집기
    if (d) {
      paths.push(
        `<path transform="translate(${penX.toFixed(1)} 0) scale(1 -1)" fill="${color}" d="${d}"/>`
      );
      const b = glyph.path.bbox; // 폰트 단위, y-up
      if (isFinite(b.minX)) {
        minX = Math.min(minX, penX + b.minX);
        maxX = Math.max(maxX, penX + b.maxX);
        minY = Math.min(minY, -b.maxY);
        maxY = Math.max(maxY, -b.minY);
      }
    }
    penX += pos.xAdvance;
  });

  const pad = 40;
  const x = (minX - pad).toFixed(1);
  const y = (minY - pad).toFixed(1);
  const w = (maxX - minX + pad * 2).toFixed(1);
  const h = (maxY - minY + pad * 2).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="healwith">
${paths.join("\n")}
</svg>
`;
}

const light = buildWordmark({ healColor: "#0d9488", withColor: "#334155" });
const dark = buildWordmark({ healColor: "#2dd4bf", withColor: "#e2e8f0" });

await writeFile(path.join(ROOT, "public/brand/wordmark.svg"), light);
await writeFile(path.join(ROOT, "public/brand/wordmark-dark.svg"), dark);
console.log("✓ public/brand/wordmark.svg");
console.log("✓ public/brand/wordmark-dark.svg");
