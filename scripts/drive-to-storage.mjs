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
 * 쓰는 법:
 *   node scripts/drive-to-storage.mjs --case 260907_KANAFINA --dry
 *   node scripts/drive-to-storage.mjs --case 260907_KANAFINA
 *   (--dry 는 «받을 수 있나»만 헤더로 확인하고 실제로는 안 옮긴다)
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
const caseIdx = args.indexOf("--case");
const CASE = caseIdx >= 0 ? args[caseIdx + 1] : null;

if (!CASE) {
  console.error("사용법: node scripts/drive-to-storage.mjs --case <케이스이름> [--dry]");
  process.exit(1);
}

// 옮길 목록. 파일 ID 는 구글 드라이브 주소의 /d/{여기}/ 부분이다.
const CASES = {
  "260907_KANAFINA": [
    ["MAMMOGRAPHY 25.09.2025.zip", "1zAODKsgiFdirFZQR6Pc1I1xV5R8fgZSd"],
    ["TOMOSYNTHESIS 06.20.2025.zip", "1RrHkZWcJuC1gZEmYILOJjrhS15yoHJyR"],
    ["MRI 26.03.2025.zip", "1SXA6MvAZzDQbzkot2SkJaZk4xECvPsL5"],
    ["CT 08.10.2025.zip", "1mWFpdfHhy049aBi6IVycNV1o6Nh4XmiL"],
    ["Lung CT 04.09.2026.zip", "17BiKHRCctV-S7MqUHRPOmI_RIQY-YbT7"],
    ["PET-CT 05.06.2026.zip", "1F4kyYvt9GEhTtO4FSYzeCGD6T1PARlKe"],
    ["PET-CT prior to 27.03.2025.zip", "1p8AQ8ZRkkggeX50V2BM-85pSkwFH-zaa"],
  ],
};

const items = CASES[CASE];
if (!items) {
  console.error(`모르는 케이스: ${CASE}. 아는 것: ${Object.keys(CASES).join(", ")}`);
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
  try {
    const res = await fetch(driveUrl(id), { redirect: "follow" });
    const size = Number(res.headers.get("content-length") || 0);
    if (!res.ok) { failed.push(`${name}: HTTP ${res.status}`); res.body?.cancel(); continue; }
    // 구글이 «바이러스 검사 안내 페이지»를 주면 HTML 이 온다 — 파일인 줄 알고 저장하면 안 된다.
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("text/html")) { failed.push(`${name}: 확인 페이지가 떴다(공개 아님?)`); res.body?.cancel(); continue; }

    if (DRY) { console.log(`[확인] ${name.padEnd(34)} ${MB(size)}MB 받을 수 있음`); okCount++; res.body?.cancel(); continue; }

    // 메모리에 통째로 올리면 큰 파일에서 죽는다 — 디스크를 거쳐 스트림으로 넘긴다.
    const tmp = path.join(os.tmpdir(), `d2s_${id}.bin`);
    const t0 = Date.now();
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    const real = fs.statSync(tmp).size;
    const { error } = await sb.storage.from(BUCKET).upload(dest, fs.createReadStream(tmp), {
      contentType: "application/zip", duplex: "half", upsert: true,
    });
    fs.unlinkSync(tmp);
    if (error) { failed.push(`${name}: ${error.message}`); continue; }
    console.log(`✅ ${name.padEnd(34)} ${MB(real)}MB  ${Math.round((Date.now() - t0) / 1000)}초`);
    okCount++;
  } catch (err) {
    failed.push(`${name}: ${err.message}`);
  }
}

console.log(`\n${DRY ? "확인" : "옮김"} ${okCount}/${items.length}`);
if (failed.length) {
  console.error("실패:");
  for (const f of failed) console.error("  · " + f);
  process.exit(1);
}
