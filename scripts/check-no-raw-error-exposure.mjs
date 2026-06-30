#!/usr/bin/env node
// 환자/공개 화면(클라이언트 컴포넌트)에 원시 예외 메시지가 새는 걸 차단하는 가드.
//
// 왜: 2026-06-30 #459 머지 충돌을 `git checkout --ours`로 풀면서 #463이 막아둔
//     err.message 화면노출이 환자 비자·견적 화면에 되살아남(POSTMORTEMS #52). CI 빌드·스모크는
//     통과해 못 잡음 → 사람이 아니라 이 가드가 매번 차단한다.
//
// 무엇을 잡나(저오탐 idiom만): 사용자노출 함수가 catch 변수의 .message를 그대로 받는 패턴.
//   setError(err.message) / setError(error.message)
//   alert(... err.message) / alert(copy.x + error.message)
//   toast(... e.message)
// API 라우트(app/api)는 별도 규칙(internal_error 코드형)이라 제외 — 여기선 클라이언트 화면만.
//
// 예외 허용: 정말 안전한 경우 해당 줄에 `// allow-raw-error` 주석을 달면 통과.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "src"];
const EXTS = new Set([".jsx", ".tsx", ".js", ".ts"]);
// 제외 경로.
// - app/api: 서버 라우트(별도 규칙 internal_error 코드형).
// - 직원 포털(admin·coordinator·hospital·agency·clinic): 인증된 내부 화면 — 외부 PII 노출 위험 낮음.
//   현재 35곳 기존 누출이 남아있어 우선 스코프 밖(POSTMORTEMS #52 후속으로 일괄 정리 예정).
//   ⚠️ 이 가드의 1차 목적 = 환자/공개 화면(외부 노출) 회귀 차단(2026-06-30 #459 회귀 재발방지).
// 경로는 아래서 슬래시로 정규화 후 매칭(윈도우 역슬래시·top-level 디렉터리 대응).
const SKIP = [
  /(^|\/)app\/api\//,
  /(^|\/)node_modules\//,
  /\.test\./,
  /(^|\/)scripts\//,
  /(^|\/)app\/(admin|coordinator|hospital|agency|clinic)\//, // 직원 포털 — #52 후속
  /(^|\/)src\/components\/costs\//, // 미사용(import 0) 컴포넌트
];

// 사용자 노출 함수가 catch 변수(.message)를 원시로 받는 패턴
const LEAK = /(setError|alert|toast|setStatus|setMessage|setErrorMsg)\s*\([^)]*\b(err|error|e|ex|_err|_error)\.message\b/;

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name)) && !SKIP.some((re) => re.test(p.replace(/\\/g, "/")))) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r, []));
const hits = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (LEAK.test(line) && !line.includes("allow-raw-error")) {
      hits.push(`  ${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
    }
  });
}

if (hits.length) {
  console.error(`❌ 화면에 원시 err.message 노출 ${hits.length}곳 (보안 — CLAUDE.md "API/화면에 error.message 노출 금지"):`);
  console.error(hits.join("\n"));
  console.error(`\n→ setError(true)+일반 localized 메시지, alert(copy.x)처럼 원시 .message 제거. 정말 안전하면 줄 끝에 // allow-raw-error.`);
  process.exit(1);
}
console.log(`✓ 원시 err.message 화면노출 0 (검사 ${files.length}개 파일)`);
