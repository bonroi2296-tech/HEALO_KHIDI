#!/usr/bin/env node
/**
 * 「없는 칸(컬럼)에 쓰기」 전수 검사 — 타입검사가 «못 보는» 자리까지 훑는다.
 *
 * 왜 필요한가: supabase-js 2.112 부터 없는 칸에 쓰면 타입검사에서 걸린다. 하지만
 *   ① supabase 를 `as any` 로 감싼 곳  ② tsconfig 에서 제외된 scripts/·e2e/
 *   ③ 계산된 키(update[key] = ...)
 *   이 세 가지는 타입검사가 통째로 지나친다. 실제로 2026-08-06 에 여기서만 5곳이 나왔다.
 *
 * 어떻게: 글자 맞추기가 아니라 «구문 나무(AST)»로 `.from("표").insert/update/upsert({...})`
 *   를 찾아 최상위 칸 이름을 뽑고, 실서비스 DB 의 information_schema 와 대조한다.
 *   객체 리터럴이 아닌 인자(변수·전개)는 「못 읽음」으로 따로 세어 보고한다 — 조용히 빼지 않는다.
 *
 * 사용: node scripts/check-ghost-columns.mjs
 * 필요 env(.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   (칸 존재 확인엔 anon 으로 충분하다 — PostgREST 가 select= 를 접근권한보다 먼저 해석해서
 *    없는 칸이면 42703, 있는데 권한이 없으면 200 + 빈 목록이 온다.)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src", "scripts", "e2e"];
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "archive", "__snapshots__"]);
const EXTS = new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"]);
const WRITE_METHODS = new Set(["insert", "update", "upsert"]);

// ── .env.local 로더 (dotenv 없이, CRLF·따옴표 허용)
//
// ⚠️ 따옴표를 벗기는 것만으론 부족하다. 이 저장소의 .env.local 에는 값이 «리터럴 \n»으로
//    끝나는 줄이 있다(SUPABASE_SERVICE_ROLE_KEY). 그걸 열쇠의 일부로 읽으면 401 «Invalid API key»
//    가 나서, 멀쩡한 열쇠를 「폐기됐다」고 오진하게 된다(2026-08-06 실제로 그렇게 헛짚었다).
//    Next.js 의 로더는 이걸 처리하므로 실서비스는 멀쩡하다 — 문제는 이런 «직접 읽는» 스크립트다.
function unquote(v) {
  const s = v.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  return s.replace(/\\n/g, "\n").trim();
}
const env = {};
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = unquote(m[2]);
  }
} catch { /* env 없으면 아래에서 안내하고 종료 */ }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// service_role 이 있으면 그걸 쓴다 — 접근권한 규칙(RLS)을 건너뛰므로 규칙이 꼬인 표
// (예: user_roles 의 규칙이 자기를 다시 불러 42P17 무한재귀)까지 판정할 수 있다.
// 없으면 anon 으로도 «칸 존재» 확인은 된다(그 표만 「판정 불가」로 남는다).
const ANON =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function* walkFiles(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walkFiles(p);
    else if (EXTS.has(extname(name))) yield p;
  }
}

/** 호출 사슬을 거슬러 올라가 .from("표이름") 을 찾는다. */
function findTableName(expr) {
  let cur = expr;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === "from") {
        const arg = cur.arguments[0];
        if (arg && ts.isStringLiteralLike(arg)) return arg.text;
        return null; // 표 이름이 변수 → 판정 불가
      }
      cur = ts.isPropertyAccessExpression(callee) ? callee.expression : null;
    } else if (ts.isPropertyAccessExpression(cur)) {
      cur = cur.expression;
    } else if (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isNonNullExpression(cur)) {
      cur = cur.expression;
    } else return null;
  }
  return null;
}

/**
 * 인자가 변수면 그 변수를 따라간다 — `const p = {...}` 로 만들고 나중에 `p.x = ...` 로
 * 덧붙이는 게 이 저장소의 흔한 모양이라, 안 따라가면 대부분을 「못 읽음」으로 흘려보낸다.
 * 같은 파일 안의 «단순한» 경우만 본다(재대입·함수 인자 등은 그대로 못 읽음 처리).
 */
function resolveVariable(name, src) {
  let decl = null, multiple = false;
  const extra = [];
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) {
      if (decl) multiple = true;
      decl = n.initializer;
    }
    // p.foo = ... / p["foo"] = ...  형태로 나중에 덧붙이는 칸
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const l = n.left;
      if (ts.isPropertyAccessExpression(l) && ts.isIdentifier(l.expression) && l.expression.text === name) {
        extra.push(l.name.text);
      } else if (ts.isElementAccessExpression(l) && ts.isIdentifier(l.expression) && l.expression.text === name) {
        if (ts.isStringLiteralLike(l.argumentExpression)) extra.push(l.argumentExpression.text);
        else extra.push(null); // 계산된 키 → 이름 못 읽음
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  if (!decl || multiple) return null;
  return { decl, extra };
}

/** 저장 인자에서 최상위 칸 이름을 뽑는다. 못 읽으면 unreadable 로 표시. */
function extractColumns(arg, src) {
  if (!arg) return { cols: [], unreadable: "인자 없음" };
  if (ts.isIdentifier(arg) && src) {
    const r = resolveVariable(arg.text, src);
    if (!r) return { cols: [], unreadable: `변수 ${arg.text} 를 못 따라감(여러 번 대입 등)` };
    const base = extractColumns(r.decl, src);
    const named = r.extra.filter((x) => x !== null);
    const hasComputed = r.extra.some((x) => x === null);
    return {
      cols: [...new Set([...base.cols, ...named])],
      unreadable: hasComputed ? `변수 ${arg.text} 에 계산된 키로 덧붙임 — 그 이름은 못 읽음` : base.unreadable,
    };
  }
  if (ts.isArrayLiteralExpression(arg)) {
    const cols = new Set();
    let unreadable = null;
    for (const el of arg.elements) {
      const r = extractColumns(el, src);
      r.cols.forEach((c) => cols.add(c));
      if (r.unreadable) unreadable = r.unreadable;
    }
    return { cols: [...cols], unreadable };
  }
  if (ts.isAsExpression(arg) || ts.isParenthesizedExpression(arg)) return extractColumns(arg.expression, src);
  if (!ts.isObjectLiteralExpression(arg)) return { cols: [], unreadable: "객체 리터럴이 아님(변수 등)" };

  const cols = [];
  let unreadable = null;
  for (const p of arg.properties) {
    if (ts.isSpreadAssignment(p)) { unreadable = "전개(...) 포함 — 그 안은 못 읽음"; continue; }
    const n = p.name;
    if (!n) { unreadable = "이름 없는 항목"; continue; }
    if (ts.isIdentifier(n) || ts.isStringLiteralLike(n)) cols.push(n.text);
    else if (ts.isComputedPropertyName(n)) unreadable = "계산된 키([x]) 포함 — 그 이름은 못 읽음";
  }
  return { cols, unreadable };
}

/**
 * 이 저장 자리를 «타입검사가 덮는가».
 * 안 덮는 3가지: ①tsconfig 제외 폴더(scripts·e2e) ②checkJs 가 꺼져 있어 .js/.mjs 는 검사 안 함
 * ③supabase 를 `as any` 로 감싼 호출 — 캐스트가 검사를 통째로 무력화한다.
 */
const TSCONFIG_EXCLUDED = /^(scripts|e2e|archive|migrations)\//;
function typecheckCovers(relPath, node) {
  if (TSCONFIG_EXCLUDED.test(relPath)) return false;
  if (/\.(js|jsx|mjs)$/.test(relPath)) return false; // checkJs 꺼짐
  // 호출 사슬 어딘가에 `as any` 가 있으면 검사가 죽는다
  let cur = node.expression;
  while (cur) {
    if (ts.isAsExpression(cur) || ts.isTypeAssertionExpression?.(cur)) {
      const t = cur.type;
      if (t && (t.kind === ts.SyntaxKind.AnyKeyword || t.kind === ts.SyntaxKind.UnknownKeyword)) return false;
    }
    cur = ts.isPropertyAccessExpression(cur) || ts.isCallExpression(cur)
      ? cur.expression
      : (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isNonNullExpression(cur))
        ? cur.expression
        : null;
  }
  return true;
}

// ── 1) 저장 자리 수집
const sites = [];
for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(join(ROOT, dir))) {
    const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text;
        if (WRITE_METHODS.has(method)) {
          const table = findTableName(node.expression.expression);
          if (table) {
            const { cols, unreadable } = extractColumns(node.arguments[0], src);
            const { line } = src.getLineAndCharacterOfPosition(node.getStart());
            const rel = relative(ROOT, file).replace(/\\/g, "/");
            sites.push({
              file: rel, line: line + 1, table, method, cols, unreadable,
              typecheckCovers: typecheckCovers(rel, node),
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
}

// ── 2) 실DB 와 대조
if (!SUPABASE_URL || !ANON) {
  console.log("⚠️  NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 없음 — 대조는 건너뛴다.");
  console.log(`   (찾은 저장 자리 ${sites.length}곳)`);
  process.exit(0);
}

const cache = new Map();
async function columnExists(table, col) {
  const key = `${table}.${col}`;
  if (cache.has(key)) return cache.get(key);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(col)}&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  let verdict;
  if (r.ok) verdict = "있음";
  else {
    let code = "";
    try { code = JSON.parse(await r.text()).code ?? ""; } catch {}
    // 42P01 = 표 자체가 없음, 42703 = 칸이 없음. 그 외는 판정 불가로 둔다.
    verdict = code === "42703" ? "없음" : code === "42P01" ? "표없음" : `판정불가(${r.status} ${code})`;
  }
  cache.set(key, verdict);
  return verdict;
}

const ghosts = [];
const unknowns = [];
let checked = 0;
for (const s of sites) {
  for (const col of s.cols) {
    const v = await columnExists(s.table, col);
    checked++;
    if (v === "없음" || v === "표없음") ghosts.push({ ...s, col, verdict: v });
    else if (v !== "있음") unknowns.push({ ...s, col, verdict: v });
  }
}

// ── 3) 보고
const blind = sites.filter((s) => s.unreadable);
console.log(`\n📋 저장 자리 ${sites.length}곳 · 칸 ${checked}개 대조`);

if (ghosts.length) {
  console.log(`\n🔴 없는 칸에 쓰는 자리 ${ghosts.length}건`);
  for (const g of ghosts) console.log(`   ${g.file}:${g.line}  ${g.table}.${g.col} (${g.method}) — ${g.verdict}`);
} else {
  console.log(`\n✅ 없는 칸에 쓰는 자리 0건`);
}

if (unknowns.length) {
  console.log(`\n❓ 판정 불가 ${unknowns.length}건 (권한·연결 문제일 수 있음)`);
  for (const u of unknowns) console.log(`   ${u.file}:${u.line}  ${u.table}.${u.col} — ${u.verdict}`);
}

// 못 읽은 자리를 「타입검사가 대신 덮는 것」과 「아무도 안 보는 진짜 사각지대」로 가른다.
const blindCovered = blind.filter((b) => b.typecheckCovers);
const blindReal = blind.filter((b) => !b.typecheckCovers);

console.log(`\n📐 덮개 현황`);
console.log(`   이 검사가 읽어낸 자리        : ${sites.length - blind.length}곳`);
console.log(`   못 읽었지만 타입검사가 덮음  : ${blindCovered.length}곳 (형식으로 못박혀 있음)`);
console.log(`   🕳️ 아무도 안 보는 사각지대    : ${blindReal.length}곳`);

if (blindReal.length) {
  console.log(`\n🕳️ 사각지대 ${blindReal.length}곳 — 이 검사도 타입검사도 못 본다. 손으로 봐야 한다`);
  for (const b of blindReal) console.log(`   ${b.file}:${b.line}  ${b.table}.${b.method}() — ${b.unreadable}`);
}

process.exit(ghosts.length ? 1 : 0);
