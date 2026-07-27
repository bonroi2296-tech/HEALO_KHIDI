#!/usr/bin/env node
/**
 * i18n 번역 커버리지 체크 (2026-05 업그레이드)
 *
 * 목적:
 * - `src/lib/i18n/dictionary.js` 의 언어별 번역 맵에서 누락된 key 탐지
 * - 전체 key universe(모든 언어 합집합) 기준으로 누락 판정
 * - ru/kz (1차 타겟 언어) 커버리지 강조
 * - CI 에서 실행해 번역 누락 방지
 *
 * 실행:
 *   node scripts/check-i18n-coverage.mjs
 *   node scripts/check-i18n-coverage.mjs --fail-on-missing    # exit 1 if ru/kz missing
 *   node scripts/check-i18n-coverage.mjs --all                # 전 언어 체크
 *
 * 예시 출력:
 *   [i18n] kz: missing 24 keys
 *     - inquiry.agreePrivacy
 *     ...
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const FAIL_ON_MISSING = process.argv.includes("--fail-on-missing");
const CHECK_ALL = process.argv.includes("--all");

const i18nPath = path.join(process.cwd(), "src/lib/i18n/dictionary.js");
if (!fs.existsSync(i18nPath)) {
  console.error("[abort] src/lib/i18n/dictionary.js not found");
  process.exit(1);
}

const src = fs.readFileSync(i18nPath, "utf8");

// DICTIONARY를 실제로 eval하여 정확한 키 카운트.
// index.js 상단의 import문은 eval에서 막히므로 제거하고, 참조되는 심볼(LOCALES 등)은
// 빈 stub으로 대체한다(DICTIONARY 키 카운트엔 값이 무관 — 평가만 통과하면 됨).
const evalSrc =
  "var LOCALES = [], DEFAULT_LOCALE = '', LOCALE_COOKIE = '';\n" +
  src
    .replace(/^import\s.*$/gm, "")
    .replace(/^export const /gm, "const ")
    .replace(/^export function /gm, "function ")
    .replace("const DICTIONARY =", "global.__I18N_DICT =");

try {
  eval(evalSrc);
} catch (e) {
  // eval 실패 시 regex 폴백
  console.warn("[warn] eval failed, falling back to regex:", e.message);
}

let DICT = global.__I18N_DICT;

if (!DICT) {
  console.error("[abort] Could not parse DICTIONARY from i18n file");
  process.exit(1);
}

// 1차 타겟: ru, kz — 항상 체크
const PRIMARY_LANGS = ["ru", "kz"];
const ALL_LANGS = Object.keys(DICT);

// 전체 key universe
const universeSet = new Set();
ALL_LANGS.forEach((lang) => Object.keys(DICT[lang]).forEach((k) => universeSet.add(k)));
const universe = [...universeSet].sort();

console.log(`\n[i18n] Total unique keys (all languages): ${universe.length}`);
console.log(`[i18n] Languages in DICTIONARY: ${ALL_LANGS.join(", ")}\n`);

// 카테고리별 분류
function categorize(keys) {
  const cats = {};
  keys.forEach((k) => {
    const cat = k.split(".")[0];
    cats[cat] = (cats[cat] || 0) + 1;
  });
  return cats;
}

const langsToCheck = CHECK_ALL ? ALL_LANGS : PRIMARY_LANGS;
let anyMissing = false;
const results = [];

for (const lang of langsToCheck) {
  const langKeys = new Set(Object.keys(DICT[lang]));
  const missing = universe.filter((k) => !langKeys.has(k));
  const coverage = Math.round((langKeys.size / universe.length) * 100);

  if (missing.length === 0) {
    console.log(`[i18n] ${lang}: ✓ ${langKeys.size}/${universe.length} keys (${coverage}%)`);
  } else {
    anyMissing = true;
    console.log(
      `[i18n] ${lang}: ✗ ${langKeys.size}/${universe.length} keys (${coverage}%) — MISSING ${missing.length}`
    );
    const cats = categorize(missing);
    Object.entries(cats).forEach(([cat, count]) => {
      console.log(`         ${cat}: ${count} missing`);
    });
    missing.slice(0, 30).forEach((k) => console.log(`           - ${k}`));
    if (missing.length > 30) console.log(`           ... ${missing.length - 30} more`);
  }
  results.push({ lang, keys: langKeys.size, missing: missing.length, coverage });
}

// 요약 테이블
console.log("\n=== 커버리지 요약 ===");
console.log("lang | keys | coverage | missing");
console.log("-----|------|----------|--------");
results.forEach((r) =>
  console.log(
    `${r.lang.padEnd(4)} | ${String(r.keys).padEnd(4)} | ${String(r.coverage + "%").padEnd(8)} | ${r.missing}`
  )
);

if (!CHECK_ALL) {
  console.log("\n(--all 플래그로 전 언어 체크 가능)");
}

if (FAIL_ON_MISSING && anyMissing) {
  console.error(
    "\n[FAIL] ru 또는 kz 번역 누락 있음 (--fail-on-missing). CI 통과 불가."
  );
  process.exit(1);
} else if (!anyMissing) {
  console.log("\n[OK] ru/kz 커버리지 100% ✓");
}
