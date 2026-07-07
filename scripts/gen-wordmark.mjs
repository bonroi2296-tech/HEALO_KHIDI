/**
 * healwith / 힐위드 워드마크(시안1) → 벡터 SVG 로고 생성
 *
 * 글자를 path로 구움(fontkit) → 폰트 의존 없이 어디서나 동일 렌더. 시안1 색: heal(앞)=#0d9488 / with(뒤)=#334155.
 * - 영문(healwith): Pretendard ExtraBold (기존 헤더와 동일한 굵기)
 * - 한글(힐위드): Pretendard SemiBold — ExtraBold는 한글이 너무 투박해 PO가 SemiBold로 확정(2026-07-07).
 *   한국어 화면에서만 노출(상표 「힐위드」 실사용 증빙) — "힐"=teal / "위드"=slate.
 *
 * 폰트 준비(재생성 시): Pretendard ExtraBold + SemiBold OTF 필요.
 *   BASE="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static"
 *   curl -L -o /tmp/Pretendard-ExtraBold.otf "$BASE/Pretendard-ExtraBold.otf"
 *   curl -L -o /tmp/Pretendard-SemiBold.otf  "$BASE/Pretendard-SemiBold.otf"
 *   WORDMARK_FONT=/tmp/Pretendard-ExtraBold.otf WORDMARK_FONT_KO=/tmp/Pretendard-SemiBold.otf node scripts/gen-wordmark.mjs
 *
 * 결과(커밋 대상): public/brand/wordmark.svg, wordmark-dark.svg,
 *                  public/brand/wordmark-ko.svg, wordmark-ko-dark.svg
 */
import * as fontkit from "fontkit";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FONT_EB = process.env.WORDMARK_FONT || "/tmp/pf/Pretendard-ExtraBold.otf";
const FONT_KO = process.env.WORDMARK_FONT_KO || FONT_EB; // 힐위드 = SemiBold (없으면 EB로 폴백)
const TRACKING_EM = -0.03; // 자간 살짝 좁힘 (원본 tracking-tight 느낌)

function buildWordmark({ text, split, fontPath, healColor, withColor }) {
  const font = fontkit.openSync(fontPath);
  const run = font.layout(text);
  const track = TRACKING_EM * font.unitsPerEm;

  let penX = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const paths = [];

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.toSVG();
    const color = i < split ? healColor : withColor;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${text}">
${paths.join("\n")}
</svg>
`;
}

// 영문(healwith): heal|with 4글자에서 분리, ExtraBold / 한글(힐위드): 힐|위드 1글자에서 분리, SemiBold
const VARIANTS = [
  { text: "healwith", split: 4, file: "wordmark", fontPath: FONT_EB },
  { text: "힐위드", split: 1, file: "wordmark-ko", fontPath: FONT_KO },
];

for (const v of VARIANTS) {
  const light = buildWordmark({ text: v.text, split: v.split, fontPath: v.fontPath, healColor: "#0d9488", withColor: "#334155" });
  const dark = buildWordmark({ text: v.text, split: v.split, fontPath: v.fontPath, healColor: "#2dd4bf", withColor: "#e2e8f0" });
  await writeFile(path.join(ROOT, `public/brand/${v.file}.svg`), light);
  await writeFile(path.join(ROOT, `public/brand/${v.file}-dark.svg`), dark);
  console.log(`✓ public/brand/${v.file}.svg`);
  console.log(`✓ public/brand/${v.file}-dark.svg`);
}
