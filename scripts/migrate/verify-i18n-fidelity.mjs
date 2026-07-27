// 문구 이관 충실도 검증(AST) — "옮겼다"가 아니라 "원본과 같다"를 증명하는 도구.
//
// 무엇을 하나: 변경된 컴포넌트의 **기준 시점 원본**(기본 origin/main)을 파싱해 모든 문자열
// 리터럴의 *값*을 모으고, **중앙 사전(src/lib/i18n/dictionary.js)에 새로 들어간 값**이 그 안에
// 있는지 대조한다. 이스케이프 표기(\' \" 템플릿)로 인한 오탐이 없다(AST 기준).
//
// 왜 사전을 소스로 보나: 중간 산출물(이관 스크립트의 임시 JSON)이 아니라 **실제로 배포되는
// 값**을 검증해야 의미가 있다. 중간물은 작업 도중 낡을 수 있다(POSTMORTEMS #118).
//
// 쓰는 법:
//   node scripts/migrate/verify-i18n-fidelity.mjs                 # origin/main 기준
//   BASE=<ref> node scripts/migrate/verify-i18n-fidelity.mjs      # 기준점 지정
//   PREFIXES=foo.,bar. node scripts/migrate/verify-i18n-fidelity.mjs   # 검사할 키 접두어 한정
//
// 불일치가 나오면 개수가 아니라 **목록을 하나씩** 확인할 것 — 정당한 사유는 보통 둘뿐이다:
//   ① 의도된 구조 변경(예: 함수형 문구 → "{type}" 플레이스홀더)
//   ② 기준점 이동(작업 중 다른 세션이 원본을 고침) → 그 경우 최신 원본이 정답이다.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = process.cwd();
const BASE = process.env.BASE || "origin/main";
const DICT = "src/lib/i18n/dictionary.js";
const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const ONLY = (process.env.PREFIXES || "").split(",").map((s) => s.trim()).filter(Boolean);

// ── 1) 기준 시점 원본의 문자열 값 집합 ────────────────────────────────
const changed = execSync(`git -C "${ROOT}" diff --name-only ${BASE}`, { encoding: "utf8" })
  .split("\n").map((s) => s.trim()).filter(Boolean)
  .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !f.includes("lib/i18n/dictionary.js"));

const originalValues = new Set();
let parsed = 0;
const failed = [];
for (const f of changed) {
  let src;
  try { src = execSync(`git -C "${ROOT}" show ${BASE}:${f}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch { continue; } // 신규 파일
  try {
    const ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
    traverse(ast, {
      StringLiteral(p) { originalValues.add(p.node.value); },
      TemplateLiteral(p) { for (const q of p.node.quasis) originalValues.add(q.value.cooked ?? q.value.raw); },
    });
    parsed++;
  } catch (e) { failed.push(`${f}: ${e.message.slice(0, 60)}`); }
}

// ── 2) 사전에서 "이번에 새로 생긴 키"의 값 읽기 ─────────────────────
// 기준 시점 사전에 없던 키 = 이번 이관으로 들어온 키.
const baseDict = (() => {
  try { return execSync(`git -C "${ROOT}" show ${BASE}:${DICT}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch { return ""; }
})();
const nowDict = readFileSync(DICT, "utf8");

const values = {}; // key -> {lang: value}
let lang = null;
for (const line of nowDict.split(/\r?\n/)) {
  const sec = line.match(/^ {2}([a-z]{2}): \{\s*$/);
  if (sec) { lang = sec[1]; continue; }
  if (/^\};/.test(line)) { lang = null; continue; }
  if (!lang || !LANGS.includes(lang)) continue;
  const kv = line.match(/^ {4}"((?:[^"\\]|\\.)+)": "((?:[^"\\]|\\.)*)",?\s*$/);
  if (!kv) continue;
  const key = JSON.parse(`"${kv[1]}"`);
  if (baseDict.includes(`"${key}":`)) continue;            // 기존 키는 검사 대상 아님
  if (ONLY.length && !ONLY.some((p) => key.startsWith(p))) continue;
  (values[key] ||= {})[lang] = JSON.parse(`"${kv[2]}"`);
}

// ── 3) 대조 ──────────────────────────────────────────────────────
let checked = 0;
const missing = [];
for (const [k, byLang] of Object.entries(values)) {
  for (const l of LANGS) {
    if (!(l in byLang)) continue;
    checked++;
    if (!originalValues.has(byLang[l])) missing.push({ key: `${k}.${l}`, val: byLang[l] });
  }
}

console.log(`기준 ${BASE} · 원본 ${parsed}/${changed.length}개 파싱 · 리터럴 ${originalValues.size}개`);
if (failed.length) console.log(`파싱 실패: ${failed.join(" | ")}`);
console.log(`신규 사전 키 ${Object.keys(values).length}개 · 값 ${checked}개 대조 · 원본에 없는 값 ${missing.length}건`);
for (const m of missing.slice(0, 60)) console.log(`  ? ${m.key} = ${JSON.stringify(m.val).slice(0, 90)}`);
process.exitCode = missing.length ? 1 : 0;
