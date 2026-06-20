/**
 * healwith 워드마크(시안1) → 벡터 SVG 로고 생성
 *
 * 원래 헤더와 동일한 Pretendard ExtraBold 글꼴로 글자를 path로 구움(fontkit) →
 * 폰트 의존 없이 어디서나 동일 렌더. 시안1 색: heal=#0d9488 / with=#334155.
 *
 * 폰트 준비(재생성 시): Pretendard ExtraBold OTF 필요.
 *   curl -L -o /tmp/Pretendard-ExtraBold.otf \
 *   "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-ExtraBold.otf"
 *   WORDMARK_FONT=/tmp/Pretendard-ExtraBold.otf node scripts/gen-wordmark.mjs
 *
 * 결과(커밋 대상): public/brand/wordmark.svg, wordmark-dark.svg
 */
import * as fontkit from "fontkit";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FONT_PATH = process.env.WORDMARK_FONT || "/tmp/pf/Pretendard-ExtraBold.otf";
const TEXT = "healwith";
const SPLIT = 4; // "heal" | "with"
const TRACKING_EM = -0.03; // 자간 살짝 좁힘 (원본 tracking-tight 느낌)

function buildWordmark({ healColor, withColor }) {
  const font = fontkit.openSync(FONT_PATH);
  const run = font.layout(TEXT);
  const track = TRACKING_EM * font.unitsPerEm;

  let penX = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const paths = [];

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.toSVG();
    const color = i < SPLIT ? healColor : withColor;
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
    penX += pos.xAdvance + track;
  });

  // 글자에 딱 맞는 tight 박스 (좌우 약간 여백만)
  const padX = font.unitsPerEm * 0.02;
  const x = (minX - padX).toFixed(1);
  const y = minY.toFixed(1);
  const w = (maxX - minX + padX * 2).toFixed(1);
  const h = (maxY - minY).toFixed(1);

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
