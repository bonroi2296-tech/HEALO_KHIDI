#!/usr/bin/env node
/**
 * 업로드 안내와 실제 파일 고르기 칸이 어긋나는 것을 막는다.
 *
 * 왜 만들었나 (2026-09-08, PR #1678·#1681):
 *   환자 서류함·문의 퍼널·인테이크 세 화면이 안내 문구는 정책(uploadPolicy)에서 뽑아
 *   「PDF · JPG · … · DICOM · MP3 · TXT」라고 보여주면서, 정작 파일 고르기 칸(accept)과
 *   화면 검사는 옛 목록을 따로 박아두고 있었다. 환자가 Word 진단서·병원 CD 의 DICOM·
 *   음성 메모를 고르면 회색으로 잠겨 있거나 그 자리에서 거부됐다. 안내가 거짓말을 한 셈이다.
 *
 * 무엇을 재나:
 *   describeUpload(...) 로 «안내»를 뽑는 화면은 accept 도 UPLOAD_POLICY 에서 뽑아야 한다.
 *   같은 파일 안에서 안내는 정책, accept 는 문자열 리터럴이면 그 둘은 반드시 어긋난다.
 *
 * 무엇을 안 재나 (일부러):
 *   - 안내 문구가 없는 화면(어드민 로고 등)은 대상이 아니다. 그 화면들은 받는 것이
 *     한 가지로 뻔해서 어긋날 여지가 적고, 예외 목록만 길어진다.
 *   - 서버 허용 목록과의 대조는 안 한다. 서버는 화면보다 넓게 받는 게 정상이다
 *     (드래그 앤 드롭은 accept 를 무시하므로 서버가 진짜 문지기다).
 *
 * 실행: node scripts/check-upload-policy.mjs
 *       node scripts/check-upload-policy.mjs --selftest   ← 「진짜 잡는지」를 먼저 잰다
 */

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "src"];
const EXTS = [".jsx", ".tsx", ".js", ".ts"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTS.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

/** 한 뿌리를 훑어 어긋난 자리를 모은다. base 를 바꿔 자기시험에서도 같은 코드를 쓴다. */
function scan(base) {
  const found = [];
  let seen = 0;
  for (const d of SCAN_DIRS) {
    let files;
    try {
      files = walk(join(base, d));
    } catch {
      continue; // 자기시험 임시 뿌리엔 한쪽 폴더만 있을 수 있다
    }
    for (const file of files) {
      const rel = relative(base, file).replace(/\\/g, "/");
      // 정책 파일 자신은 대상이 아니다 — 여기 적힌 accept 는 «정답»이고, 주석에도 등장한다.
      if (rel === "src/lib/uploadPolicy.js") continue;

      const src = readFileSync(file, "utf8");
      // 안내를 정책에서 뽑는 화면만 대상 — 그 화면은 accept 도 같은 출처여야 한다.
      if (!src.includes("describeUpload(")) continue;
      seen++;
      // accept="..." 형태(문자열 리터럴). accept={...} 는 정책을 쓰는 정상 형태.
      src.split("\n").forEach((line, i) => {
        if (/^\s*(\*|\/\/)/.test(line)) return; // 주석 줄은 설명이지 코드가 아니다
        const m = line.match(/accept\s*=\s*"([^"]*)"/);
        if (m) found.push({ file: rel, line: i + 1, value: m[1] });
      });
    }
  }
  return { found, seen };
}

// ─── 자기시험 — 「결함을 심으면 진짜 빨간불이 뜨나」를 먼저 잰다 ───
// 왜: 검사 12개 중 2개가 «결함을 심어도 통과하는 가짜»였다(2026-08 실측, 17%).
// 초록불이 「막았다」는 뜻인지 아무도 안 재던 자리다.
if (process.argv.includes("--selftest")) {
  const tmp = mkdtempSync(join(tmpdir(), "upload-policy-"));
  const write = (rel, body) => {
    const full = join(tmp, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  };
  const cases = [
    // [이름, 파일 내용, 잡혀야 하나]
    ["안내는 정책인데 accept 는 옛 목록", `<p>{describeUpload("medicalDoc", lang)}</p>\n<input type="file" accept=".pdf,.jpg" />`, true],
    ["둘 다 정책", `<p>{describeUpload("medicalDoc", lang)}</p>\n<input type="file" accept={UPLOAD_POLICY.medicalDoc.accept} />`, false],
    ["안내가 없으면 대상 아님", `<input type="file" accept="image/*" />`, false],
    ["주석 속 accept 는 코드가 아니다", `// accept="옛날 예시"\n<p>{describeUpload("medicalDoc", lang)}</p>\n<input accept={UPLOAD_POLICY.image.accept} />`, false],
  ];
  let bad = 0;
  cases.forEach(([name, body, shouldCatch], i) => {
    rmSync(join(tmp, "app"), { recursive: true, force: true });
    write(`app/case${i}.jsx`, body);
    const caught = scan(tmp).found.length > 0;
    const ok = caught === shouldCatch;
    if (!ok) bad++;
    console.log(`  ${ok ? "✅" : "❌"} ${name} — ${shouldCatch ? "잡아야" : "통과해야"} 함, 실제 ${caught ? "잡음" : "통과"}`);
  });
  rmSync(tmp, { recursive: true, force: true });
  if (bad) {
    console.error(`\n[upload-policy] 자기시험 ${bad}건 실패 — 이 검사는 «가짜 초록불»이다. 고치기 전엔 믿지 마라.`);
    process.exit(1);
  }
  console.log("[upload-policy] 자기시험 통과 — 결함을 심으면 실제로 빨간불이 뜬다.\n");
}

const { found: offenders, seen: checked } = scan(ROOT);

if (offenders.length === 0) {
  console.log(`[upload-policy] OK — 안내를 정책에서 뽑는 화면 ${checked}곳, accept 하드코딩 0건`);
  process.exit(0);
}

console.error(`[upload-policy] 안내와 파일 고르기 칸이 어긋난 자리 ${offenders.length}건\n`);
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}`);
  console.error(`    accept="${o.value}"`);
  console.error(`    → accept={UPLOAD_POLICY.medicalDoc.accept} 처럼 정책에서 뽑아라.`);
  console.error(`       (안내는 describeUpload 로 정책을 보여주면서 여기만 옛 목록이면 화면이 거짓말을 한다)\n`);
}
console.error(`검사한 화면 ${checked}곳. 규칙: src/lib/uploadPolicy.js 가 형식 목록의 단일 출처다.`);
process.exit(1);
