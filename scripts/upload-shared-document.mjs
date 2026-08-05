#!/usr/bin/env node
/**
 * upload-shared-document — 「환자에게 보낼 서류」를 파일에서 바로 올린다(코디 화면 대신).
 *
 * 코디 화면(/coordinator/inbox/<번호>)에서 버튼으로 올리는 게 정상 동선이다. 이 스크립트는
 * 파일이 이미 PC 에 있고 여러 개를 한꺼번에 넣을 때만 쓴다.
 *
 * 사용:
 *   node scripts/upload-shared-document.mjs <문의번호> <파일> [파일...]
 *
 * ⚠️ 올려도 **환자에게는 안 보인다.** 코디가 화면에서 「환자에게 보이기」를 켠 것만 나간다.
 *    이 스크립트는 그 스위치를 켜지 않는다 — 켜는 건 사람이 화면에서 한 번 더 판단할 일이다.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  if (process.env[key]) return process.env[key];
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const t = line.trim();
      if (!t.startsWith(`${key}=`)) continue;
      return t.slice(key.length + 1).trim().replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

const MIME = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const [inquiryArg, ...files] = process.argv.slice(2);
const inquiryId = Number(inquiryArg);
if (!Number.isInteger(inquiryId) || !files.length) {
  console.error("사용법: node scripts/upload-shared-document.mjs <문의번호> <파일> [파일...]");
  process.exit(1);
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// 파일명이 storage 키로 들어가므로 ASCII 밖 글자·공백을 정리한다(코디 화면 업로드와 같은 규칙).
function safeKey(name) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 없음: ${file}`);
    continue;
  }
  const name = path.basename(file);
  const ext = path.extname(name).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    console.error(`❌ 못 올리는 형식: ${name} (PDF·워드·사진만)`);
    continue;
  }

  const buf = fs.readFileSync(file);
  const key = `inquiry/${inquiryId}/shared/${randomUUID()}_${safeKey(name)}`;

  const { error: upErr } = await db.storage
    .from("attachments")
    .upload(key, buf, { contentType: mime, upsert: false });
  if (upErr) {
    console.error(`❌ 저장 실패 ${name}: ${upErr.message}`);
    continue;
  }

  const { error: insErr } = await db.from("case_shared_documents").insert({
    inquiry_id: inquiryId,
    file_name: name,
    storage_path: key,
    mime,
    size_bytes: buf.length,
  });
  if (insErr) {
    await db.storage.from("attachments").remove([key]);
    console.error(`❌ 기록 실패 ${name}: ${insErr.message}`);
    continue;
  }

  console.log(`✅ ${name} (${Math.round(buf.length / 1024)}KB) — 아직 «환자에게 안 보임»`);
}

console.log(`\n👉 환자에게 보이려면 /coordinator/inbox/${inquiryId} 에서 「환자에게 보이기」를 켜라.`);
