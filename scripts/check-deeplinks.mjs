#!/usr/bin/env node
/**
 * 죽은 딥링크 차단 — 「알림은 ?thread=/?inquiry= 로 보내는데 그 화면이 그 값을 안 읽는」 것.
 *
 * 왜 만드나 (같은 병이 두 번 났다):
 *   2026-07-13 — 옛 Human Agent 대시보드로 보내던 품질경고 알림이 thread 를 안 읽었다(judge.ts 주석).
 *   2026-08-28 — /coordinator/messages 로 보내던 AI 부정평가 알림이 같은 병이었다. 그리고
 *                같은 날 내가 새로 배선한 링크 하나도 «읽는 쪽이 목록을 다시 안 불러» 죽어 있었다.
 *   주소는 그럴듯하고, 눌러도 404 가 아니라 «목록»이 뜬다 → 아무도 고장인 줄 모른다.
 *
 * 무엇을 보나: 소스의 `link:` 값 중 «쿼리가 붙은 내부 주소»를 모으고, 그 주소에 해당하는
 *   화면 폴더가 그 쿼리 이름을 실제로 읽는지 본다(useDeepLinkParam("x") 또는 get("x")).
 * 무엇을 «안» 보나: 쿼리 없는 링크(목록으로 보내는 게 맞는 알림), 외부 주소, 시험 파일.
 *   → 「목록으로 보내도 되나」는 사람이 판단할 일이라 기계가 끼어들지 않는다.
 *
 * 사용: node scripts/check-deeplinks.mjs [--selftest]
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

const isTestFile = (f) => /\.(test|spec|contract\.test)\.[a-z]+$/.test(f);

/**
 * `link:` 뒤에 오는 «내부 주소 + 쿼리» 를 뽑는다.
 * 삼항식(`link: id ? \`/x?y=${id}\` : "/x"`)도 잡아야 한다 — 실제로 그 형태를 놓쳐서
 * 검사기를 만든 날 링크 하나가 그물 밖에 있었다(2026-08-28 자체 점검).
 */
export function extractDeepLinks(source) {
  const out = [];
  const anchors = /\blink:/g;
  let a;
  while ((a = anchors.exec(source))) {
    const chunk = source.slice(a.index, a.index + 300);
    const lits = /[`"']([^`"'\n]*)[`"']/g;
    let m;
    while ((m = lits.exec(chunk))) {
      const raw = m[1];
      if (!raw.startsWith("/") || !raw.includes("?")) continue; // 외부 주소·쿼리 없는 건 통과
      const [path, query] = raw.split("?");
      const param = (query || "").split("=")[0];
      if (path && param) out.push({ path, param });
    }
  }
  return out;
}

/** 그 화면 폴더의 파일들이 그 쿼리 이름을 읽는가. */
function screenReadsParam(routePath, param) {
  const dir = join(ROOT, "app", routePath.replace(/^\//, ""));
  if (!existsSync(dir)) return { ok: false, why: `화면 폴더가 없다 (app${routePath})` };
  const files = walk(dir);
  if (files.length === 0) return { ok: false, why: `화면 폴더가 비어 있다 (app${routePath})` };
  const needle = new RegExp(`(useDeepLinkParam\\s*\\(\\s*["'\`]${param}["'\`]|get\\(\\s*["'\`]${param}["'\`]\\s*\\))`);
  for (const f of files) {
    if (isTestFile(f)) continue;
    if (needle.test(readFileSync(f, "utf8"))) return { ok: true };
  }
  return { ok: false, why: `그 화면이 "${param}" 를 안 읽는다 — 눌러도 목록만 열린다` };
}

function run() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))).filter((f) => !isTestFile(f));
  const seen = new Map(); // "path?param" -> 처음 발견한 파일
  for (const f of files) {
    for (const { path, param } of extractDeepLinks(readFileSync(f, "utf8"))) {
      const key = `${path}?${param}`;
      if (!seen.has(key)) seen.set(key, { path, param, file: f.replace(ROOT + "/", "") });
    }
  }

  const bad = [];
  for (const { path, param, file } of seen.values()) {
    const r = screenReadsParam(path, param);
    if (!r.ok) bad.push({ path, param, file, why: r.why });
  }

  if (bad.length) {
    console.error(`\n❌ 죽은 딥링크 ${bad.length}건 — 알림은 «그 건»으로 보내는데 화면이 안 받는다\n`);
    for (const b of bad) {
      console.error(`  [${b.file}] link: ${b.path}?${b.param}=…`);
      console.error(`    → ${b.why}`);
      console.error(`    고치는 법: 그 화면에서 useDeepLinkParam("${b.param}", …) 로 받아라.`);
      console.error(`               «목록»으로 보내는 게 맞다면 link 에서 ?${b.param}= 를 빼라.\n`);
    }
    process.exit(1);
  }
  console.log(`✓ 딥링크 검사 통과 (링크 ${seen.size}개 — 전부 받는 화면이 있다)`);
}

/** 검사기가 «진짜 잡는지» 스스로 시험한다 — 잡는 것과 안 잡는 것 둘 다. */
function selftest() {
  const cases = [
    ["쿼리 딥링크를 뽑는다", () => {
      const got = extractDeepLinks('link: `/admin/chat?thread=${id}`,');
      return got.length === 1 && got[0].path === "/admin/chat" && got[0].param === "thread";
    }],
    ["따옴표 링크도 뽑는다", () => {
      const got = extractDeepLinks('link: "/admin/inquiries?inquiry=5",');
      return got.length === 1 && got[0].param === "inquiry";
    }],
    ["쿼리 없는 링크는 «안» 뽑는다 (목록으로 보내는 건 사람 판단)", () =>
      extractDeepLinks('link: "/admin/consultations",').length === 0],
    ["외부 주소는 «안» 뽑는다", () =>
      extractDeepLinks('link: "https://example.com/x?y=1",').length === 0],
    ["삼항식 링크도 뽑는다 (그물 밖에 있던 형태)", () => {
      const got = extractDeepLinks('link: leadId ? `/hospital/leads?lead=${leadId}` : "/hospital/leads",');
      return got.length === 1 && got[0].path === "/hospital/leads" && got[0].param === "lead";
    }],
    ["없는 화면은 잡는다", () => {
      const r = screenReadsParam("/no/such/screen", "thread");
      return r.ok === false;
    }],
    ["안 읽는 쿼리는 잡는다", () => {
      const r = screenReadsParam("/admin/chat", "nonexistent_param_xyz");
      return r.ok === false;
    }],
    ["읽는 쿼리는 통과시킨다", () => screenReadsParam("/admin/chat", "thread").ok === true],
  ];
  let failed = 0;
  for (const [name, fn] of cases) {
    let ok = false;
    try { ok = fn(); } catch { ok = false; }
    if (!ok) { console.error(`  ✗ ${name}`); failed++; }
  }
  if (failed) { console.error(`❌ 딥링크 검사기 자체시험 실패 ${failed}건`); process.exit(1); }
  console.log(`✅ selftest 통과 — 잡는 것 ${cases.length}가지 확인`);
}

if (process.argv.includes("--selftest")) selftest();
else run();
