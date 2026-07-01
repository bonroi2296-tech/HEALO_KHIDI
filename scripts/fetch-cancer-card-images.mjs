#!/usr/bin/env node
/**
 * 암종 상세 카드/합병증 이미지 자체호스팅 다운로더 (fetch-doctor-photos.mjs 와 같은 방식)
 *
 * 왜: immuneCancerDetails.js 의 IMMUNE_BASE(immunehospital.com/resource/images) 핫링크는
 *     원본이 바뀌면 깨진다. 의사 사진(PR #548)처럼 카드/합병증 이미지도 public/ 로 내려받아
 *     로컬 경로로 참조. 저작권: 면력한방병원(직영 파트너, 사용권 있음).
 *
 * 저장: resource/images/<path> → public/immune/cancer/<path>
 *       (예: resource/images/card/cancer-card22-1.jpg → public/immune/cancer/card/cancer-card22-1.jpg)
 *
 * 실행: node scripts/fetch-cancer-card-images.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const REMOTE_BASE = "https://immunehospital.com/resource/images";
const LOCAL_ROOT = join(process.cwd(), "public", "immune", "cancer");

// IMMUNE_BASE 를 쓰던 이미지들의 상대경로 (immuneCancerDetails.js 와 1:1)
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const PATHS = [
  // 합병증 (대장/위 전용 disease9-12)
  ...[9, 10, 11, 12].map((n) => `cancer-disease${n}.jpg`),
  // 식이/장루/상처/갑상선 관리 카드
  ...range(1, 7).map((n) => `card/cancer-card22-${n}.jpg`),
  ...range(1, 8).map((n) => `card/cancer-card23-${n}.jpg`),
  ...range(1, 5).map((n) => `card/cancer-card24-${n}.jpg`),
  ...range(1, 6).map((n) => `card/cancer-card27-${n}.jpg`),
  ...range(1, 6).map((n) => `card/cancer-card28-${n}.jpg`),
];

const missing = [];
let ok = 0;

for (const rel of PATHS) {
  const url = `${REMOTE_BASE}/${rel}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      missing.push(`${rel} (HTTP ${res.status})`);
      console.warn(`✗ ${rel} — HTTP ${res.status} (폴백 처리)`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = join(LOCAL_ROOT, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    ok++;
    console.log(`✓ ${rel} (${(buf.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    missing.push(`${rel} (${e.message})`);
    console.warn(`✗ ${rel} — ${e.message} (폴백 처리)`);
  }
}

console.log(`\n완료: ${ok}/${PATHS.length} 저장`);
if (missing.length) {
  console.log(`폴백(404/오류) ${missing.length}건 — 화면은 onError→healSvg 로 처리됨:`);
  missing.forEach((m) => console.log(`  - ${m}`));
}
