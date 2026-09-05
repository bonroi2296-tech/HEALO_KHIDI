#!/usr/bin/env node
/**
 * 영향 반경 «안»의 검사만 골라 실제로 돌린다 — 목록을 주는 것과 돌려보는 것은 다르다.
 *
 * 왜 필요한가 (실측):
 *   합치기 신청서에는 지금 «빠른 검사(@smoke)» 24개만 돈다. 전체 여정 검사는 본판에 합친 «뒤»에만
 *   돌아서, 파생 파손은 구조적으로 «머지 후»에 발견된다. 그런데 파생 파손은 정의상
 *   «내가 안 열어본 화면»에서 나므로, 빠른 검사 목록에 들어 있을 이유가 없다.
 *   → 반경에 든 화면의 검사를 «신청서 단계에서» 골라 돌린다. 전체(10~15분)를 다 도는 게 아니라
 *     이번 변경이 실제로 닿는 것만.
 *
 * 무엇을 고르나:
 *   `blast-radius.mjs --json` 의 반경 안 화면 → 그 주소를 실제로 여는 검사 파일.
 *   빠른 검사(@smoke)는 이미 따로 도니 «빠른 검사에 없는 것»만 추린다(중복 실행 방지).
 *
 * 사용:
 *   node scripts/blast-verify.mjs            # 골라서 실제로 돌린다
 *   node scripts/blast-verify.mjs --list     # 뭘 돌릴지만 출력(자동 검사에서 목록만 뽑을 때)
 *   node scripts/blast-verify.mjs --base <ref>
 *
 * 종료코드: 고른 검사가 실패하면 그 코드를 그대로 물려준다(여긴 «판정»이라 차단이 맞다 —
 *   지도(blast-radius)와 달리 이건 실제로 돌려본 결과다).
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const LIST_ONLY = argv.includes("--list");
const baseIdx = argv.indexOf("--base");
const BASE = baseIdx === -1 ? null : argv[baseIdx + 1];
const commitIdx = argv.indexOf("--commit");
const COMMIT = commitIdx === -1 ? null : argv[commitIdx + 1];

function radius() {
  const args = ["scripts/blast-radius.mjs", "--json"];
  if (COMMIT) args.push("--commit", COMMIT);
  else if (BASE) args.push("--base", BASE);
  try {
    return JSON.parse(execFileSync("node", args, { cwd: ROOT, encoding: "utf8", timeout: 30000 }));
  } catch (e) {
    console.error("영향 반경을 못 구했다:", e.message);
    process.exit(0); // 지도를 못 그린다고 신청서를 막지는 않는다
  }
}

const data = radius();
const routes = data.impactedRoutes || [];

// 반경 안 화면을 «여는» 검사 파일 모으기
const e2eFiles = new Set();
const unitFiles = new Set();
for (const r of routes) {
  for (const f of r.coveredBy || []) {
    // e2e/fixtures/… 같은 도우미 파일은 검사가 아니다 — 넘기면 playwright 가 「검사 0개」로 실패한다.
    if (f.startsWith("e2e/")) {
      if (/\.spec\.[tj]sx?$/.test(f)) e2eFiles.add(f);
    } else if (/\.(test|spec)\.[tj]sx?$/.test(f)) unitFiles.add(f);
  }
}

/** 빠른 검사(@smoke)는 신청서에서 이미 따로 도니 빼고 — 같은 걸 두 번 돌릴 이유가 없다 */
function isSmoke(f) {
  try {
    return /@smoke/.test(fs.readFileSync(path.join(ROOT, f), "utf8"));
  } catch {
    return false;
  }
}
const maxIdx = argv.indexOf("--max");
const MAX = maxIdx === -1 ? 0 : Number(argv[maxIdx + 1]) || 0;
// 단위 검사는 본 검사(ci.yml)에서 이미 «전부» 돈다(1100개+). 거기서 부를 땐 빼야 중복이 안 된다.
const SKIP_UNIT = argv.includes("--skip-unit");

// 🛑 알파벳순으로 정렬하지 마라. `routes` 는 이미 «가까운 순»(hops 오름차순)이고 Set 은 그
//    순서를 지키므로, 그대로 두면 이번에 «직접» 고친 화면의 검사가 앞에 온다. 예전엔 여기서
//    .sort() 로 알파벳순으로 엎은 뒤 앞에서 잘라서, t·u 로 시작하는 검사(treatments·
//    telemedicine)가 반경이 넓을 때마다 «구조적으로 항상» 잘렸다 — 2026-08-31 #1564 가 바로
//    그 사례다. 이 도구가 treatments 검사를 정확히 골라놓고 --max 6 컷에 버렸고, 그 PR 이
//    본판 E2E 를 6회 연속 빨간불로 만들었다(2026-09-02 규명).
const e2eAll = [...e2eFiles].filter((f) => !isSmoke(f));
// 상한을 두면 «잘랐다»고 반드시 말한다 — 조용한 상한은 「전부 봤다」로 읽혀서 제일 해롭다.
const e2eExtra = MAX > 0 ? e2eAll.slice(0, MAX) : e2eAll;
const e2eDropped = e2eAll.length - e2eExtra.length;
const unitList = SKIP_UNIT ? [] : [...unitFiles].sort();

const derived = routes.filter((r) => r.hops > 0);
const uncovered = (data.uncovered || []).filter((r) => r.hops > 0);

console.log("");
console.log(`🧪 반경 안 검사 고르기 — ${data.label}`);
console.log(`   반경 안 화면 ${routes.length}개 (그중 파생 ${derived.length}개)`);
console.log(`   → 고른 여정 검사 ${e2eExtra.length}개 · 단위 검사 ${unitList.length}개`);
if (e2eDropped > 0) {
  console.log(`   ✂️ 시간 상한(--max ${MAX})으로 여정 검사 ${e2eDropped}개를 «안 돌렸다» — 초록불이어도 전부 본 게 아니다:`);
  e2eAll.slice(MAX).forEach((f) => console.log(`      ${f}`));
}
if (uncovered.length) {
  // 「돌릴 게 없다 = 안전하다」로 읽히면 안 된다. 조용한 상한은 반드시 말한다.
  console.log(`   ⚠️ 검사가 «아예 없는» 파생 화면 ${uncovered.length}개는 여기서 못 돈다 — 눈으로 봐야 한다:`);
  uncovered.slice(0, 10).forEach((r) => console.log(`      ${r.url}`));
  if (uncovered.length > 10) console.log(`      … 외 ${uncovered.length - 10}개`);
}
console.log("");

if (LIST_ONLY) {
  console.log("E2E_FILES=" + e2eExtra.join(" "));
  console.log("UNIT_FILES=" + unitList.join(" "));
  process.exit(0);
}

if (!e2eExtra.length && !unitList.length) {
  console.log("   고를 검사가 없다. (반경이 좁거나, 반경 안 화면에 검사가 없다)");
  process.exit(0);
}

let code = 0;

if (unitList.length) {
  console.log(`▶ 단위 검사 ${unitList.length}개`);
  const r = spawnSync("npx", ["vitest", "run", ...unitList], { cwd: ROOT, stdio: "inherit" });
  if (r.status) code = r.status;
}

if (e2eExtra.length) {
  console.log(`▶ 여정 검사 ${e2eExtra.length}개 (빠른 검사에 없는 것만)`);
  const r = spawnSync("npx", ["playwright", "test", ...e2eExtra], { cwd: ROOT, stdio: "inherit" });
  if (r.status) code = r.status;
}

process.exit(code);
