#!/usr/bin/env node
/**
 * i18n 번역 커버리지 체크
 *
 * 목적:
 * - `src/lib/i18n/index.js` 의 언어별 번역 맵에서 누락된 key 탐지
 * - 특정 언어(en)를 기준으로, 다른 언어에 없는 key 리스트업
 * - CI 에서 실행해 번역 누락 방지
 *
 * 실행:
 *   node scripts/check-i18n-coverage.mjs
 *   node scripts/check-i18n-coverage.mjs --fail-on-missing (exit 1 if missing)
 *
 * 예시 출력:
 *   [i18n] ko: missing 3 keys
 *     - auth.resetPassword
 *     - hospitals.sortBy
 *     - intake.step3.title
 */

import fs from "node:fs";
import path from "node:path";

const FAIL_ON_MISSING = process.argv.includes("--fail-on-missing");

const i18nPath = path.join(process.cwd(), "src/lib/i18n/index.js");
if (!fs.existsSync(i18nPath)) {
  console.error("[abort] src/lib/i18n/index.js not found");
  process.exit(1);
}

const src = fs.readFileSync(i18nPath, "utf8");

// 언어별 블록 탐지 (lang code 다음 { ... } 까지)
// 예: `  ko: {` 또는 `  "ko": {`
const LANG_BLOCK_RE = /^\s*(?:["']?)([a-z]{2}(?:-[A-Z]{2})?)(?:["']?)\s*:\s*\{/gm;

const langMatches = [...src.matchAll(LANG_BLOCK_RE)];
if (langMatches.length < 2) {
  console.error("[abort] Could not detect language blocks in i18n file");
  process.exit(1);
}

function extractKeys(startIdx) {
  // 블록 시작 중괄호부터 매칭 괄호까지의 문자열 추출
  let depth = 0;
  let i = startIdx;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const block = src.slice(startIdx, i + 1);

  // key 추출 — "key.path": "value" 또는 'key.path': 'value' 또는 key.path: "value"
  const keys = new Set();
  const KEY_RE = /["']([a-zA-Z][a-zA-Z0-9._-]*)["']\s*:/g;
  let m;
  while ((m = KEY_RE.exec(block))) {
    keys.add(m[1]);
  }
  return keys;
}

const langs = {};
for (const match of langMatches) {
  const langCode = match[1];
  const braceIdx = src.indexOf("{", match.index);
  if (braceIdx === -1) continue;
  langs[langCode] = extractKeys(braceIdx);
}

const langCodes = Object.keys(langs);
console.log(`[i18n] detected ${langCodes.length} languages: ${langCodes.join(", ")}`);

// en 을 기준으로
const baseLang = langs["en"] ? "en" : langCodes[0];
const baseKeys = langs[baseLang];
console.log(`[i18n] base language: ${baseLang} (${baseKeys.size} keys)`);

let anyMissing = false;
for (const lang of langCodes) {
  if (lang === baseLang) continue;
  const missing = [];
  for (const key of baseKeys) {
    if (!langs[lang].has(key)) missing.push(key);
  }
  const extra = [];
  for (const key of langs[lang]) {
    if (!baseKeys.has(key)) extra.push(key);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[i18n] ${lang}: ✓ complete (${langs[lang].size} keys)`);
  } else {
    anyMissing = true;
    console.log(`[i18n] ${lang}: missing ${missing.length}, extra ${extra.length}`);
    for (const k of missing.slice(0, 20)) console.log(`  - missing: ${k}`);
    if (missing.length > 20) console.log(`  ... ${missing.length - 20} more missing`);
    for (const k of extra.slice(0, 10)) console.log(`  + extra: ${k}`);
    if (extra.length > 10) console.log(`  ... ${extra.length - 10} more extra`);
  }
}

if (FAIL_ON_MISSING && anyMissing) {
  console.error("\n[fail] Translation coverage incomplete (--fail-on-missing set)");
  process.exit(1);
}
