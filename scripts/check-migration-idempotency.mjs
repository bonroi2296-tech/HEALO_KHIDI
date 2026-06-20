// 마이그레이션 멱등성(재실행 안전) 검사.
// 왜: 과거에 DROP ... IF EXISTS 가드 누락으로 같은 마이그레이션을 재적용하면
//     "duplicate_object(42710)" 로 하드 실패 → 새 DB·재해복구·CI 재적용 위험.
//     PO가 화면에서 찾게 두지 말고 매 PR에서 기계가 차단한다(CLAUDE.md 상시 루틴).
//
// 검사 대상 (고신뢰·오탐 0 룰만):
//  1) CREATE POLICY  → 같은 이름·테이블의 DROP POLICY IF EXISTS 가 앞에 있어야 함
//  2) CREATE TRIGGER → 같은 이름·테이블의 DROP TRIGGER IF EXISTS 가 앞에 있어야 함
//  3) CREATE INDEX   → IF NOT EXISTS 필수
//  4) CREATE TABLE   → IF NOT EXISTS 필수
//  5) ADD CONSTRAINT → 같은 이름의 DROP CONSTRAINT IF EXISTS 가 앞에 있거나
//                      DO 블록(pg_constraint 존재검사)으로 감싸져 있어야 함
//
// Postgres 는 CREATE POLICY/TRIGGER 에 IF NOT EXISTS 가 없으므로
// "DROP IF EXISTS 후 CREATE" 가 표준 멱등 패턴이다.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, "..", "migrations");

const problems = [];
const P = (file, msg) => problems.push(`${file}: ${msg}`);

// 주석 제거: 줄주석(--) + 블록주석(/* */). 문자열 안 -- 는 이 repo 마이그레이션엔 없음(허용).
function stripComments(sql) {
  // 블록주석 제거 (개행 보존해 라인 추적 유지)
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  // 줄주석 제거
  out = out
    .split("\n")
    .map((line) => {
      const i = line.indexOf("--");
      return i >= 0 ? line.slice(0, i) : line;
    })
    .join("\n");
  return out;
}

const norm = (s) => s.replace(/"/g, "").trim().toLowerCase();
const normTable = (s) => norm(s).replace(/^public\./, "");

function checkFile(file, raw) {
  const sql = stripComments(raw);

  // ── 1) CREATE POLICY ↔ DROP POLICY IF EXISTS ──
  const dropPolicies = new Set();
  for (const m of sql.matchAll(/drop\s+policy\s+if\s+exists\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/gi)) {
    dropPolicies.add(`${norm(m[1])}|${normTable(m[2])}`);
  }
  for (const m of sql.matchAll(/create\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/gi)) {
    const key = `${norm(m[1])}|${normTable(m[2])}`;
    if (!dropPolicies.has(key)) {
      P(file, `CREATE POLICY ${m[1]} ON ${m[2]} — 앞에 DROP POLICY IF EXISTS 가드 없음(재실행 시 42710 실패)`);
    }
  }

  // ── 2) CREATE TRIGGER ↔ DROP TRIGGER IF EXISTS ──
  const dropTriggers = new Set();
  for (const m of sql.matchAll(/drop\s+trigger\s+if\s+exists\s+([a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/gi)) {
    dropTriggers.add(`${norm(m[1])}|${normTable(m[2])}`);
  }
  for (const m of sql.matchAll(/create\s+(?:constraint\s+)?trigger\s+([a-z0-9_]+)[\s\S]*?\son\s+([a-z0-9_."]+)/gi)) {
    const key = `${norm(m[1])}|${normTable(m[2])}`;
    if (!dropTriggers.has(key)) {
      P(file, `CREATE TRIGGER ${m[1]} ON ${m[2]} — 앞에 DROP TRIGGER IF EXISTS 가드 없음`);
    }
  }

  // ── 3) CREATE INDEX → IF NOT EXISTS ──
  for (const m of sql.matchAll(/create\s+(?:unique\s+)?index\s+(concurrently\s+)?(if\s+not\s+exists\s+)?([a-z0-9_]+)/gi)) {
    if (!m[2]) {
      P(file, `CREATE INDEX ${m[3]} — IF NOT EXISTS 없음`);
    }
  }

  // ── 4) CREATE TABLE → IF NOT EXISTS ──
  for (const m of sql.matchAll(/create\s+table\s+(if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi)) {
    if (!m[1]) {
      P(file, `CREATE TABLE ${m[2]} — IF NOT EXISTS 없음`);
    }
  }

  // ── 5) ADD CONSTRAINT → DROP CONSTRAINT IF EXISTS 또는 DO 블록 가드 ──
  const dropConstraints = new Set();
  for (const m of sql.matchAll(/drop\s+constraint\s+if\s+exists\s+([a-z0-9_]+)/gi)) {
    dropConstraints.add(norm(m[1]));
  }
  const hasDoConstraintGuard = /pg_constraint/i.test(sql); // DO $$ ... pg_constraint 존재검사 패턴
  for (const m of sql.matchAll(/add\s+constraint\s+([a-z0-9_]+)/gi)) {
    if (!dropConstraints.has(norm(m[1])) && !hasDoConstraintGuard) {
      P(file, `ADD CONSTRAINT ${m[1]} — 앞에 DROP CONSTRAINT IF EXISTS 또는 DO/pg_constraint 가드 없음`);
    }
  }
}

const files = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  checkFile(f, readFileSync(join(MIG_DIR, f), "utf8"));
}

if (problems.length) {
  console.error(`✗ 마이그레이션 멱등성 검사 실패 — ${problems.length}건 (재실행 시 충돌 위험)\n`);
  for (const p of problems) console.error("  - " + p);
  console.error(
    `\n해결: CREATE POLICY/TRIGGER 앞에 'DROP ... IF EXISTS' 추가, CREATE INDEX/TABLE 에 'IF NOT EXISTS' 추가,\n` +
      `      ADD CONSTRAINT 앞에 'DROP CONSTRAINT IF EXISTS' 추가. (좋은 예: migrations/20260225_chat_threads.sql)`
  );
  process.exit(1);
}

console.log(`✓ 마이그레이션 멱등성 검사 통과 (${files.length}개 파일 — 정책·트리거·인덱스·테이블·제약 재실행 안전)`);
