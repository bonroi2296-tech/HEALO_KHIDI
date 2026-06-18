#!/usr/bin/env node
/**
 * 콘텐츠 일관성 자동 검사 (CI 매 PR 실행 — 사람이 스크린샷으로 찾지 않게)
 *
 * 왜: 리브랜딩/콘텐츠 변경 때 "옛 모델 잔재"(옛 브랜드·옛 이메일·일부 언어만 적힌 목록·
 *     일부 언어에 키 누락)가 사람이 발견할 때까지 남는 사고가 반복됨. → 기계가 매번 차단.
 *
 * 검사:
 *  1) 금지 토큰: 고객/제품 코드(app·src·components)에 옛 이메일/도메인 잔재 있으면 실패.
 *  2) i18n 키 패리티: 활성 6개 언어(ko·en·ru·kz·zh·ja)가 같은 키 집합을 갖는지(영어 기준 누락 검출).
 *
 * 실행: node scripts/check-content-consistency.mjs   (npm run check:content)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "components"];
const EXCLUDE = /node_modules|\.next|\.test\.|\.spec\.|__tests__|\/archive\//;
const CODE_EXT = /\.(js|jsx|ts|tsx)$/;

// ── 1) 금지 토큰 (고객/제품 코드에 절대 없어야 함) ──────────────
const FORBIDDEN = [
  { re: /immunelab/i, msg: "옛 이메일 도메인 immunelab 잔재 (→ admin@healwith.co.kr)" },
  { re: /@healo\.com/i, msg: "옛 이메일 @healo.com 잔재 (→ admin@healwith.co.kr)" },
  { re: /healo\.com/i, msg: "옛 도메인 healo.com 잔재" },
  // ponytail: @healo.kr 이메일만 차단(.com만 막던 구멍). 현 사이트 도메인 khidi.healo.kr(@ 없음)·api 호스트 allowlist는 안 걸림.
  { re: /@healo\.kr/i, msg: "옛 이메일 @healo.kr 잔재 (→ admin@healwith.co.kr)" },
  { re: /HEALO-KHIDI/, msg: "옛 브랜드 HEALO-KHIDI 가 제품 코드에 (코드명은 주석/내부만, 고객 텍스트 금지)" },
];

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const e of entries) {
    const rel = join(dir, e);
    if (EXCLUDE.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(rel));
    else if (CODE_EXT.test(e) && !EXCLUDE.test(rel)) out.push(rel);
  }
  return out;
}

const errors = [];

for (const file of SCAN_DIRS.flatMap(walk)) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const f of FORBIDDEN) {
      if (f.re.test(line)) errors.push(`[금지토큰] ${file}:${i + 1} — ${f.msg}\n    ${line.trim().slice(0, 120)}`);
    }
  });
}

// ── 2) i18n 활성 6개 언어 키 패리티 ─────────────────────────────
const ACTIVE = ["ko", "en", "ru", "kz", "zh", "ja"];
const I18N = "src/lib/i18n/index.js";
try {
  const text = readFileSync(join(ROOT, I18N), "utf8").split("\n");
  // 최상위 언어 블록 시작: "  xx: {"
  const blocks = {}; // lang -> {start, keys:Set}
  let cur = null;
  text.forEach((line, idx) => {
    const m = line.match(/^ {2}([a-z]{2}): \{\s*$/);
    if (m) { cur = m[1]; blocks[cur] = new Set(); return; }
    if (/^ {2}\};?\s*$/.test(line)) { cur = null; return; } // 블록 종료(최상위 객체 닫힘 등)
    if (cur) {
      const k = line.match(/^\s{3,}"([^"]+)":/);
      if (k) blocks[cur].add(k[1]);
    }
  });
  const ref = blocks.en;
  if (!ref || ref.size === 0) {
    errors.push(`[i18n] 기준(en) 블록을 못 읽음 — 검사 스크립트 점검 필요`);
  } else {
    for (const lang of ACTIVE) {
      if (lang === "en") continue;
      const b = blocks[lang];
      if (!b) { errors.push(`[i18n] 활성 언어 '${lang}' 블록이 없음`); continue; }
      const missing = [...ref].filter((k) => !b.has(k));
      if (missing.length) {
        errors.push(`[i18n] '${lang}' 에 키 ${missing.length}개 누락 (en 기준): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
      }
    }
  }
} catch (e) {
  errors.push(`[i18n] ${I18N} 읽기 실패: ${e.message}`);
}

// ── 결과 ────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n❌ 콘텐츠 일관성 검사 실패 (${errors.length}건)\n`);
  errors.forEach((e) => console.error("  " + e + "\n"));
  console.error("→ 고친 뒤 다시 커밋하세요. (옛 브랜드/이메일 잔재·언어별 키 누락 방지)\n");
  process.exit(1);
}
console.log("✓ 콘텐츠 일관성 검사 통과 (금지토큰 0 · i18n 활성6 키 패리티 OK)");
