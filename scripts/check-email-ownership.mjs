#!/usr/bin/env node
// 「로그인 이메일이 같으면 본인 것」이라고 판정하는 곳은 반드시 «인증된» 이메일만 써야 한다는 가드.
//
// 왜: 문의는 로그인 전에도 넣을 수 있어서, 나중에 가입한 계정과 이어 붙이는 열쇠가 이메일뿐이다.
//     그런데 메일 인증을 안 거친 계정이 세션을 받을 수 있게 되는 순간,
//     «남의 주소로 가입만 하면» 그 사람의 문의·증상기록·여정이 통째로 보인다.
//     2026-08-13 점검: 그렇게 판정하는 4곳 중 `portal/followup` 하나만 email_confirmed_at 을
//     확인하고 있었고, my-inquiries·symptoms·journey 세 곳은 확인 없이 주소만 맞춰봤다.
//     (당시 로그인 설정이 메일 확인을 요구해서 실제로 뚫리진 않았지만,
//      설정 하나가 바뀌면 사라지는 방어였다 — 그래서 코드에서 한 겹 더 잠갔다.)
//
// 무엇을 잡나: 복호화한 이메일을 로그인 이메일과 «맞춰보는» 파일이
//             getConfirmedEmail 도 email_confirmed_at 도 안 쓰는 경우.
//
// 대상 밖: 직원(admin·coordinator) 라우트 — 직원은 애초에 전체를 보는 권한이라
//          「본인 것」 판정이 아니다.
//
// 예외 허용: 그 줄 끝에 `// allow-unverified-email-match`.
//
// 자체시험: node scripts/check-email-ownership.mjs --selftest

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "app";
const EXTS = new Set([".ts", ".js"]);
const SKIP = [/\.test\./, /\.contract\./, /(^|\/)app\/api\/admin\//, /(^|\/)app\/api\/coordinator\//];

// 복호화한 이메일을 로그인 이메일과 맞춰보는 idiom.
const MATCH = /(safeDecrypt|decryptMaybe|decryptStringNullable)\s*\([^)]*email[^)]*\)[^;]*(===|==)\s*target/;
// 인증 확인 흔적(둘 중 하나만 있어도 통과)
const VERIFIED = /getConfirmedEmail|email_confirmed_at/;

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

if (process.argv.includes("--selftest")) {
  const cases = [
    ['.filter((i) => safeDecrypt(i.email).trim().toLowerCase() === target)', true],
    ['(recent || []).find((i) => decryptMaybe(i.email).toLowerCase() === target)', true],
    ['if (sourceLang === targetLang) return null;', false],
    ['const primary = results.find((r) => r.date === targetDate);', false],
  ];
  let bad = 0;
  for (const [line, want] of cases) {
    const got = MATCH.test(line);
    if (got !== want) { bad++; console.error(`  자체시험 실패: ${JSON.stringify(line)} → ${got}, 기대 ${want}`); }
  }
  if (bad) { console.error(`❌ 자체시험 ${bad}건 실패 — 가드가 고장난 상태다.`); process.exit(1); }
  console.log("✓ 자체시험 통과");
  process.exit(0);
}

const files = walk(ROOT, []).filter((p) => !SKIP.some((re) => re.test(p.replace(/\\/g, "/"))));
const hits = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split("\n");
  const matched = lines.some((l) => MATCH.test(l) && !l.includes("allow-unverified-email-match"));
  if (matched && !VERIFIED.test(src)) {
    const i = lines.findIndex((l) => MATCH.test(l));
    hits.push(`  ${f}:${i + 1}  ${lines[i].trim().slice(0, 110)}`);
  }
}

if (hits.length) {
  console.error(`❌ 「이메일이 같으면 본인 것」 판정 ${hits.length}곳이 «인증 안 된» 주소를 그대로 쓴다:`);
  console.error(hits.join("\n"));
  console.error(`\n→ getConfirmedEmail(auth.userId, auth.email) 로 감싸라(src/lib/auth/verifiedEmail.ts).`);
  process.exit(1);
}
console.log(`✓ 이메일 소유권 판정 전부 인증된 주소 사용 (검사 ${files.length}개 파일)`);
