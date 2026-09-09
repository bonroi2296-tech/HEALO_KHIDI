#!/usr/bin/env node
/**
 * 구글 드라이브 공개 링크 → 우리 저장소로 사본 뜨기.
 *
 * 왜 만들었나 (2026-09-08 PO 결정):
 *   에이전시가 환자 영상(DICOM zip, 실측 7.1GB)을 «구글 드라이브 링크»로 넘긴다.
 *   그 링크는 언제든 닫힐 수 있고, 실제로 그 파일들은 「링크 아는 누구나 편집 가능」
 *   상태여서 남이 «지울 수도» 있었다. 사본이 없으면 나중에 병원 재의뢰·분쟁에서
 *   자료가 통째로 없다. → 우리 저장소에 사본을 둔다.
 *
 * 왜 우리 저장소인가:
 *   Supabase Pro 저장소 100GB 를 이미 사고 있고 지금 2GB 만 쓴다. 영상 환자를 매달
 *   한 명씩 받아도 1년치는 추가 비용 0원, 3년치라야 월 5천 원 수준이다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🛑 옮길 목록을 이 파일에 «적지 마라». (2026-09-08 실사고 — 재발 금지)
 *
 *   처음 판은 케이스 이름(「접수날짜_환자 성」)과 드라이브 파일 ID 7개를 이 파일에
 *   그대로 박아 두었다. **이 저장소는 공개다.** 파일 이름이 곧 검사 이력이라
 *   (검사 종류 + 촬영 날짜) 「이름 + 병 + 검사 날짜」가 한 파일에 같이 있었고,
 *   커밋은 밀어 올리는 순간 되돌릴 수 없다. 그 신청서는 닫고 이렇게 다시 만들었다.
 *
 *   → 목록은 **저장소 밖 파일**에서 읽는다. `.gitignore` 가 `*.cases.json` 을 막는다.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 쓰는 법:
 *   1) 목록 파일을 저장소 «밖»(또는 추적 안 되는 이름)에 만든다 — 예: ../transfer.cases.json
 *        {
 *          "<케이스이름>": [
 *            ["<파일이름>.zip", "<드라이브 파일 ID>"],
 *            ["<파일이름>.zip", "<드라이브 파일 ID>"]
 *          ]
 *        }
 *      (드라이브 파일 ID = 주소의 /d/{여기}/ 부분)
 *   2) node scripts/drive-to-storage.mjs --cases ../transfer.cases.json --case <케이스이름> --dry
 *   3) node scripts/drive-to-storage.mjs --cases ../transfer.cases.json --case <케이스이름>
 *      (--dry 는 «받을 수 있나»만 헤더로 확인하고 실제로는 안 옮긴다)
 *
 * ⚠️ 이 스크립트는 «공개(anyone) 링크»만 다룬다. 비공개 공유 파일은 구글 자격증명이
 *    필요한데, 그건 아직 안 붙였다 — 그때는 사람이 내려받아 화면으로 올려야 한다.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const BUCKET = "attachments";
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const argOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const CASE = argOf("--case");
const CASES_FILE = argOf("--cases");

const usage = `사용법: node scripts/drive-to-storage.mjs --cases <목록파일.json> --case <케이스이름> [--dry]

  목록파일은 이 저장소 «밖»에 둬라 — 환자 정보는 공개 저장소에 커밋하지 않는다.
  모양: { "<케이스이름>": [ ["<파일이름>.zip", "<드라이브 파일 ID>"] ] }`;

if (!CASE || !CASES_FILE) {
  console.error(usage);
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(CASES_FILE, "utf8"));
} catch (err) {
  console.error(`목록 파일을 못 읽었다 (${CASES_FILE}): ${err.message}\n\n${usage}`);
  process.exit(1);
}

const items = catalog?.[CASE];
if (!Array.isArray(items) || items.length === 0) {
  // 🛑 «아는 케이스» 목록을 화면에 뿌리지 마라 — 그것도 환자 이름이다.
  console.error(`목록 파일에 «${CASE}» 항목이 없거나 비어 있다. 파일: ${CASES_FILE}`);
  process.exit(1);
}

function env() {
  const strip = (v) => v.trim().replace(/^["']|["']$/g, "");
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), strip(l.slice(l.indexOf("=") + 1))])
  );
}

const driveUrl = (id) =>
  `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
const MB = (n) => (n / 1024 / 1024).toFixed(0);

const e = env();
const sb = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let okCount = 0, failed = [];
for (const [name, id] of items) {
  const dest = `imaging/${CASE}/${name.trim().replace(/\s+/g, "_")}`;
  let tmp = null;
  try {
    // 🛑 같은 이름이 이미 있으면 «덮지 않는다». 이 도구의 목적은 「사라질 수 있는 원본의
    //    사본을 남기는 것」인데, upsert 로 덮으면 지키려던 그 사본을 스스로 지운다.
    //    (드라이브 쪽이 「누구나 편집 가능」이라 원본이 바꿔치기됐을 수도 있다.)
    const { data: existing } = await sb.storage
      .from(BUCKET)
      .list(path.posix.dirname(dest), { search: path.posix.basename(dest) });
    if (existing?.some((f) => f.name === path.posix.basename(dest))) {
      failed.push(`${name}: 저장소에 같은 이름이 이미 있다 — 덮지 않았다(지우거나 이름을 바꿔라)`);
      continue;
    }

    const res = await fetch(driveUrl(id), { redirect: "follow" });
    const size = Number(res.headers.get("content-length") || 0);
    if (!res.ok) { failed.push(`${name}: HTTP ${res.status}`); res.body?.cancel(); continue; }
    // 구글이 «바이러스 검사 안내 페이지»를 주면 HTML 이 온다 — 파일인 줄 알고 저장하면 안 된다.
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("text/html")) { failed.push(`${name}: 확인 페이지가 떴다(공개 아님?)`); res.body?.cancel(); continue; }

    if (DRY) { console.log(`[확인] ${name.padEnd(34)} ${MB(size)}MB 받을 수 있음`); okCount++; res.body?.cancel(); continue; }

    // 메모리에 통째로 올리면 큰 파일에서 죽는다 — 디스크를 거쳐 스트림으로 넘긴다.
    tmp = path.join(os.tmpdir(), `d2s_${id}.bin`);
    const t0 = Date.now();
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    const real = fs.statSync(tmp).size;

    // 🛑 «받아졌다»와 «온전히 받아졌다»는 다르다. 구글이 중간에 끊으면 짧은 zip 이 그대로
    //    올라가고 화면엔 ✅ 가 찍힌다 — 원본이 사라진 뒤에야 알게 된다. 여기서 막는다.
    if (real === 0) { failed.push(`${name}: 0바이트를 받았다`); continue; }
    if (size > 0 && real !== size) {
      failed.push(`${name}: 크기가 다르다 — 알려준 값 ${MB(size)}MB / 실제 ${MB(real)}MB (중간에 끊긴 것)`);
      continue;
    }
    if (size === 0) {
      // content-length 를 안 주는 응답(chunked)은 대조할 기준이 없다. 지우지 말고 «못 쟀다»고 알린다.
      console.warn(`   ⚠️ ${name}: 원본 크기를 안 알려줘 대조 못 함 — 받은 것은 ${MB(real)}MB`);
    }

    const { error } = await sb.storage.from(BUCKET).upload(dest, fs.createReadStream(tmp), {
      contentType: "application/zip", duplex: "half", upsert: false,
    });
    if (error) { failed.push(`${name}: ${error.message}`); continue; }
    console.log(`✅ ${name.padEnd(34)} ${MB(real)}MB  ${Math.round((Date.now() - t0) / 1000)}초`);
    okCount++;
  } catch (err) {
    failed.push(`${name}: ${err.message}`);
  } finally {
    // 🛑 성공한 길에서만 지우면, 올리다 실패했을 때 몇 GB 짜리 임시파일이 그대로 남는다.
    //    다음 실행이 디스크가 꽉 차 죽고, 그 오류는 «받기 실패»처럼 보인다.
    if (tmp) { try { fs.unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ } }
  }
}

console.log(`\n${DRY ? "확인" : "옮김"} ${okCount}/${items.length}`);
if (failed.length) {
  console.error("실패:");
  for (const f of failed) console.error("  · " + f);
  process.exit(1);
}
