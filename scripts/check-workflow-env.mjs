#!/usr/bin/env node
/**
 * E2E 스펙이 «읽는» 환경변수가 야간(프로덕션) 잡에 실려 있는지 본다.
 *
 * 왜 — 같은 사고가 두 번 났다. 둘 다 «실서비스는 멀쩡한데 검사만 빨간불» 이라
 *      원인을 찾는 데 시간이 걸렸다.
 *   2026-08-27: 역할 계정 4개가 야간 잡에만 빠져 매일 [URGENT] 메일이 왔다.
 *   2026-09-05: 저장소 열쇠 2개가 같은 자리에 빠져 첨부 파일이름 검사 6건이 죽었다(#1616).
 *
 * 🔑 기준을 «다른 잡의 env» 가 아니라 «스펙 코드가 실제로 읽는 값» 으로 잡는다.
 *    잡끼리 비교하면 서버가 읽는 값(NEXT_PUBLIC_SUPABASE_ANON_KEY·RATE_LIMIT_NAMESPACE 등)까지
 *    걸려서 잡음이 된다 — 야간은 «이미 떠 있는 실서비스» 를 보므로 서버 쪽 값은 안 넘겨도 된다.
 *    스펙이 `process.env.X` 로 직접 읽는 값만이 «없으면 그 검사가 죽는» 값이다.
 *
 * 새 스펙이 새 env 를 쓰기 시작하면 이 검사가 저절로 잡는다(목록을 손으로 안 늘려도 된다).
 */
import fs from "node:fs";
import path from "node:path";

const WF = ".github/workflows/e2e.yml";
const NIGHTLY_STEP = "Full E2E — 프로덕션 대상";
const E2E_DIR = "e2e";

/** 야간 단계의 env 키 (못 찾으면 null) */
function nightlyEnvKeys() {
  const src = fs.readFileSync(WF, "utf8").replace(/\r\n/g, "\n").split("\n");
  const at = src.findIndex((l) => l.trim() === `- name: ${NIGHTLY_STEP}`);
  if (at < 0) return null;
  let k = at + 1;
  while (k < src.length && !/^\s*env:\s*$/.test(src[k])) {
    if (/^\s*- name:/.test(src[k])) return new Set();
    k++;
  }
  const indent = src[k].search(/\S/);
  const keys = new Set();
  for (let m = k + 1; m < src.length; m++) {
    const line = src[m];
    if (!line.trim()) continue;
    if (line.search(/\S/) <= indent) break;
    const km = line.match(/^\s*([A-Z0-9_]+):/);
    if (km) keys.add(km[1]);
  }
  return keys;
}

/** e2e 스펙이 process.env 로 읽는 키 → { key: [파일…] } */
function envKeysUsedBySpecs() {
  const used = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(ts|mts|js|mjs)$/.test(e.name)) continue;
      const body = fs.readFileSync(p, "utf8");
      for (const m of body.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        if (!used.has(m[1])) used.set(m[1], new Set());
        used.get(m[1]).add(p);
      }
    }
  };
  walk(E2E_DIR);
  return used;
}

// 워크플로가 «자기가» 넣어 주거나, 없어도 되는 것
const NOT_FROM_SECRETS = new Set([
  "CI",              // 러너가 넣는다
  "E2E_BASE_URL",    // 야간은 프로덕션 URL 로 따로 준다
  "E2E_SKIP_SERVER", // 야간은 서버를 안 띄운다
  "NODE_ENV",
  "GITHUB_ACTIONS",
]);

const nightly = nightlyEnvKeys();
const used = envKeysUsedBySpecs();

if (!nightly) {
  console.error(`\n❌ 야간 단계 「${NIGHTLY_STEP}」 를 못 찾았다 — 이름이 바뀌었으면 이 검사도 고쳐라.\n`);
  process.exit(1);
}

const missing = [...used.keys()]
  .filter((k) => !nightly.has(k) && !NOT_FROM_SECRETS.has(k))
  .sort();

if (missing.length) {
  console.error("\n❌ E2E 워크플로 env 검사 실패 — 야간(프로덕션) 잡에 없는 값을 스펙이 읽는다\n");
  for (const k of missing) {
    console.error(`  - ${k}`);
    console.error(`      읽는 곳: ${[...used.get(k)].slice(0, 3).join(", ")}`);
  }
  console.error(`\n  → \`${WF}\` 의 「${NIGHTLY_STEP}」 단계 env 에 넣어라.`);
  console.error("     값은 낮 검사와 달라도 된다(야간은 실서비스를 본다). 없으면 그 검사가 통째로 죽는다.\n");
  process.exit(1);
}

console.log(`✓ E2E 워크플로 env 검사 통과 (스펙이 읽는 값 ${used.size}개 중 비밀값 필요분 전부 야간 잡에 있음)`);
