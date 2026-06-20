#!/usr/bin/env node
/**
 * 과대 이미지 재압축 (성능 — LCP/전송량 개선)
 *
 * 왜: public 이미지가 다수 1~3.6MB(병원 갤러리 등)인데 next/image 미적용 페이지가 많아
 *     원본이 그대로 전송됨 → 모바일/해외(러·카자흐) 환자에게 느림. 화면은 거의 동일하게
 *     유지하면서 폭 상한·품질 재인코딩·메타 제거로 전송량만 줄인다.
 *
 * 정책:
 *  - 대상: SCAN_DIRS 내 jpg/jpeg/png/webp 중 350KB 초과 또는 폭 2000px 초과만(반복 열화 방지).
 *  - 폭 상한 1920px(업스케일 안 함). JPEG q82 / WebP q82 / PNG palette+compression.
 *  - 결과가 더 작을 때만 덮어쓴다(원본은 git 히스토리에 보존). 확장자·경로 불변(참조 안 깨짐).
 *
 * 실행: node scripts/optimize-images.mjs        (적용)
 *       node scripts/optimize-images.mjs --dry   (계산만, 미적용)
 *       node scripts/optimize-images.mjs --check (CI 게이트: 과대 이미지 있으면 비정상 종료)
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SCAN_DIRS = ["public/images", "public/immune"];
const MAX_W = 1920;
const SIZE_THRESHOLD = 350 * 1024; // 350KB 초과만
const DIM_THRESHOLD = 2000;        // 또는 폭 2000px 초과
const HARD_MAX = 900 * 1024;       // CI 게이트: 단일 이미지 상한(이 위면 최적화 안 된 것)
const DRY = process.argv.includes("--dry");
const CHECK = process.argv.includes("--check");
const EXT = /\.(jpe?g|png|webp)$/i;

// --check: 재인코딩 없이 stat만 — 900KB 초과 이미지가 있으면 CI 실패(3MB 원본 재유입 차단).
if (CHECK) {
  const offenders = SCAN_DIRS.flatMap(walk).filter((f) => f.size > HARD_MAX);
  if (offenders.length) {
    console.error(`❌ 과대 이미지 ${offenders.length}개 (>${(HARD_MAX/1024).toFixed(0)}KB) — \`npm run optimize:images\` 실행 후 커밋하세요:`);
    for (const o of offenders) console.error(`   ${(o.size/1024).toFixed(0)}KB  ${o.rel}`);
    process.exit(1);
  }
  console.log(`✓ 이미지 용량 게이트 통과 (스캔 ${SCAN_DIRS.join("·")} — >${(HARD_MAX/1024).toFixed(0)}KB 0개)`);
  process.exit(0);
}

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const e of entries) {
    const rel = join(dir, e);
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(rel));
    else if (EXT.test(e)) out.push({ rel, size: st.size });
  }
  return out;
}

const files = SCAN_DIRS.flatMap(walk);
let before = 0, after = 0, changed = 0, scanned = 0;

for (const f of files) {
  const abs = join(ROOT, f.rel);
  let meta;
  try { meta = await sharp(abs).metadata(); } catch { continue; }
  const big = f.size > SIZE_THRESHOLD || (meta.width || 0) > DIM_THRESHOLD;
  if (!big) continue;
  scanned++;

  const ext = extname(f.rel).toLowerCase();
  let pipe = sharp(abs).rotate(); // EXIF 회전 적용 후 메타 제거
  if ((meta.width || 0) > MAX_W) pipe = pipe.resize({ width: MAX_W, withoutEnlargement: true });
  // PNG는 palette(256색) 양자화 금지 — 사진·초상에서 색 단조화(banding) 유발. 무손실 압축 + 리사이즈만.
  if (ext === ".png") pipe = pipe.png({ compressionLevel: 9, effort: 10 });
  else if (ext === ".webp") pipe = pipe.webp({ quality: 82 });
  else pipe = pipe.jpeg({ quality: 82, mozjpeg: true });

  let buf;
  try { buf = await pipe.toBuffer(); } catch { continue; }

  before += f.size;
  if (buf.length < f.size) {
    after += buf.length;
    changed++;
    if (!DRY) writeFileSync(abs, buf);
    console.log(`${DRY ? "[dry] " : ""}${f.rel}  ${(f.size/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(0)}KB  (-${(100*(1-buf.length/f.size)).toFixed(0)}%)`);
  } else {
    after += f.size; // 안 줄면 원본 유지
  }
}

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`\n대상 ${scanned}개 중 ${changed}개 축소${DRY ? " (dry-run, 미적용)" : " 적용"}.`);
console.log(`전송량 ${mb(before)}MB → ${mb(after)}MB  (-${before ? (100*(1-after/before)).toFixed(0) : 0}%)`);
