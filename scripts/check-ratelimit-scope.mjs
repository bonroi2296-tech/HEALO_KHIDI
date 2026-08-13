#!/usr/bin/env node
// 「비밀 맞히기」를 막는 관문은 반드시 DB 기반 횟수제한(checkRateLimitPersistent)을 써야 한다는 가드.
//
// 왜: Vercel 은 요청을 여러 인스턴스에 흩뿌린다. in-memory 판(checkRateLimit)은 카운터가
//     인스턴스마다 «따로» 돌아, 인스턴스가 N대면 실제 상한이 N배가 된다.
//     "1분 5회"라고 적혀 있어도 실제로는 1분 5N회 → 막혀 있는 것처럼 보이지만 덜 막혀 있다.
//     2026-08-13 점검에서 비밀번호 찾기·아이디 찾기·비밀번호 변경 + 토큰 링크 관문 8곳이
//     이 상태였다. src/lib/rateLimit.ts 안에 DB 판이 이미 있었는데 절반만 옮겨져 있었다.
//
// 무엇을 잡나: 아래 「비밀을 지키는 경로」에서 in-memory 판을 직접 호출하는 줄.
//   - app/api/auth/**            비밀번호·계정 관문
//   - 경로에 [token] / [code] 가 든 라우트   (토큰·코드를 맞혀서 남의 자료를 여는 걸 막는 관문)
//   - **/guest-join, **/rotate-token, **/claim/**  같은 부류
// 그 외 라우트(채팅·업로드 등 도배 방지용)는 대상 아님 — 뚫려도 「비밀 노출」이 아니라 소음이라
// DB 왕복 비용을 물릴 이유가 없다.
//
// 예외 허용: 정말 in-memory 로 충분하면 그 줄 끝에 `// allow-memory-ratelimit` 주석.
//
// 자체시험: node scripts/check-ratelimit-scope.mjs --selftest

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "app";
const EXTS = new Set([".ts", ".js"]);

// 비밀을 지키는 관문으로 볼 경로(슬래시 정규화 기준)
const SECRET_GATE = [
  /(^|\/)app\/api\/auth\//,
  /\[token\]/,
  /\[code\]/,
  /(^|\/)guest-join\//,
  /(^|\/)rotate-token\//,
  /(^|\/)claim\//,
];

const SKIP = [/\.test\./, /\.contract\./, /(^|\/)node_modules\//];

// in-memory 판 «호출». import 줄과 Persistent 호출은 제외.
const MEMORY_CALL = /(?<!Persistent)\bcheckRateLimit\s*\(/;

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

function scanLine(line) {
  if (line.includes("allow-memory-ratelimit")) return false;
  if (/^\s*import\s/.test(line)) return false;
  return MEMORY_CALL.test(line);
}

if (process.argv.includes("--selftest")) {
  const cases = [
    ["const rl = checkRateLimit(ip, RATE);", true],
    ["  if (!checkRateLimit(ip, RATE).allowed) {", true],
    ["const rl = await checkRateLimitPersistent(ip, RATE);", false],
    ['import { checkRateLimit, getClientIp } from "@/lib/rateLimit";', false],
    ["const rl = checkRateLimit(ip, RATE); // allow-memory-ratelimit", false],
  ];
  let bad = 0;
  for (const [line, want] of cases) {
    const got = scanLine(line);
    if (got !== want) { bad++; console.error(`  자체시험 실패: ${JSON.stringify(line)} → ${got}, 기대 ${want}`); }
  }
  const pathCases = [
    ["app/api/auth/find-id/route.ts", true],
    ["app/api/opinions/[token]/page/route.ts", true],
    ["app/c/[code]/route.ts", true],
    ["app/api/public/chat/start/route.ts", false],
  ];
  for (const [p, want] of pathCases) {
    const got = SECRET_GATE.some((re) => re.test(p));
    if (got !== want) { bad++; console.error(`  자체시험 실패(경로): ${p} → ${got}, 기대 ${want}`); }
  }
  if (bad) { console.error(`❌ 자체시험 ${bad}건 실패 — 가드가 고장난 상태다.`); process.exit(1); }
  console.log("✓ 자체시험 통과");
  process.exit(0);
}

const files = walk(ROOT, []).filter((p) => {
  const s = p.replace(/\\/g, "/");
  return !SKIP.some((re) => re.test(s)) && SECRET_GATE.some((re) => re.test(s));
});

const hits = [];
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (scanLine(line)) hits.push(`  ${f}:${i + 1}  ${line.trim().slice(0, 110)}`);
  });
}

if (hits.length) {
  console.error(`❌ 비밀 관문 ${hits.length}곳이 인스턴스별(in-memory) 횟수제한을 쓴다 — 인스턴스 수만큼 상한이 곱해진다:`);
  console.error(hits.join("\n"));
  console.error(`\n→ checkRateLimitPersistent(await 필요)로 교체. 정말 in-memory 로 충분하면 줄 끝에 // allow-memory-ratelimit`);
  process.exit(1);
}
console.log(`✓ 비밀 관문 전부 DB 기반 횟수제한 (검사 ${files.length}개 라우트)`);
