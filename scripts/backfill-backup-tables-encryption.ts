#!/usr/bin/env node
/**
 * backfill-backup-tables-encryption — 암호화 전에 떠둔 **백업 테이블**의 평문을 암호문으로 옮긴다.
 *
 * 배경(2026-07-21, PO 결정 "백업도 암호화해라"):
 *   2026-07-20 에 본 테이블(consultation_translations·consultation_messages)을 암호화하면서
 *   되돌리기용으로 `_backup_*_20260720` 스냅샷을 떴는데, **그 백업이 평문 그대로**였다.
 *   본 테이블은 잠그고 옆에 안 잠긴 사본을 둔 꼴 → 암호화의 목적(DB 통째 유출 대비)이 반쪽.
 *   외부 노출은 없음을 실측 확인했지만(anon·authenticated 둘 다 0행), 그래도 평문을 없앤다.
 *
 * 왜 지우지 않고 암호화하나: 행 수·시각·id 같은 "무슨 일이 있었나" 기록은 남기고,
 *   내용만 못 읽게 하는 쪽을 PO 가 택했다. 기록 보존 + 평문 제거를 동시에.
 *
 * 안전 설계(2026-07-20 스크립트 계승):
 *   · 한 행씩 "암호문 채우고 → 평문 지우기"를 **한 번의 UPDATE** 로 → 중간에 죽어도 어중간한 행 없음.
 *   · 이미 암호문이 있으면 건너뜀(멱등) → 재실행 안전.
 *   · 진행이 0건이면 루프를 끊는다(무한루프 방지 — 2026-07-20 에 실제로 겪은 함정).
 *   · `--dry` 로 대상 건수만 확인.
 *
 * ⚠️ encryptionV2.ts 를 import 할 수 없다(`server-only` 라 스크립트에서 throw).
 *    그래서 **같은 형식**을 재현한다. 1바이트라도 다르면 앱이 복호화 못 한다:
 *      JSON.stringify({ v:"v1", iv:base64(12B), tag:base64(16B), data:base64(ciphertext) })
 *
 * 사용:
 *   npx tsx scripts/backfill-backup-tables-encryption.ts --dry
 *   npx tsx scripts/backfill-backup-tables-encryption.ts
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DRY = process.argv.includes("--dry");
const BATCH = 100;

function env(key: string): string | null {
  if (process.env[key]) return process.env[key] as string;
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const t = line.trim();
      if (!t.startsWith(`${key}=`)) continue;
      let v = t.slice(key.length + 1).trim();
      v = v.replace(/^["']|["']$/g, "").replace(/(?:\\[rn])+$/g, "");
      return v.trim();
    }
  }
  return null;
}

function keyBuffer(): Buffer {
  const raw = env("ENCRYPTION_KEY_V1");
  if (!raw) {
    console.error("❌ ENCRYPTION_KEY_V1 없음 — 앱과 같은 키여야 복호화된다");
    process.exit(1);
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    console.error(`❌ ENCRYPTION_KEY_V1 길이가 ${buf.length}바이트 (32 필요)`);
    process.exit(1);
  }
  return buf;
}

function encryptStringNullable(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  let data = cipher.update(plaintext, "utf8", "base64");
  data += cipher.final("base64");
  return JSON.stringify({
    v: "v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data,
  });
}

// 복호화 — 옮긴 뒤 실제로 되읽히는지 검증하는 데만 쓴다(끝나고 표본 확인).
function decryptString(blob: string): string {
  const p = JSON.parse(blob);
  const d = crypto.createDecipheriv(ALGORITHM, keyBuffer(), Buffer.from(p.iv, "base64"), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  d.setAuthTag(Buffer.from(p.tag, "base64"));
  return d.update(p.data, "base64", "utf8") + d.final("utf8");
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const svc = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !svc) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const db = createClient(url, svc, { auth: { persistSession: false } });

/** 테이블 하나의 평문 컬럼들을 암호문 컬럼으로 옮긴다. */
async function migrate(table: string, pairs: [plain: string, enc: string][]) {
  const plainCols = pairs.map(([p]) => p);
  const encCols = pairs.map(([, e]) => e);
  console.log(`\n▶ ${table} — ${plainCols.join(", ")}`);

  // 대상 = 평문 컬럼 중 하나라도 값이 있는 행
  const orFilter = plainCols.map((c) => `${c}.not.is.null`).join(",");

  let moved = 0;
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(["id", ...plainCols, ...encCols].join(","))
      .or(orFilter)
      .limit(BATCH);
    if (error) {
      console.error(`  ❌ 조회 실패: ${error.message}`);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    if (DRY) {
      console.log(`  (dry) 남은 대상 최소 ${data.length}건`);
      return;
    }

    let progressed = 0;
    for (const row of data as any[]) {
      const patch: Record<string, unknown> = {};
      for (const [plain, enc] of pairs) {
        if (row[plain] == null) continue;
        // 이미 암호문이 있으면 덮지 않는다(멱등) — 평문만 지운다.
        patch[enc] = row[enc] ?? encryptStringNullable(row[plain]);
        patch[plain] = null;
      }
      if (Object.keys(patch).length === 0) continue;
      const { error: upErr } = await db.from(table).update(patch).eq("id", row.id);
      if (upErr) {
        console.error(`  ❌ 갱신 실패 (id=${row.id}): ${upErr.message}`);
        process.exit(1);
      }
      progressed++;
      moved++;
    }

    // 한 배치에서 한 건도 못 옮겼으면 조건이 안 맞는 것 — 무한루프 방지.
    if (progressed === 0) {
      console.error("  ⚠️ 진행 0건 — 루프를 끊는다(조건 불일치 의심).");
      break;
    }
    console.log(`  … ${moved}건 이전`);
  }
  console.log(`  ✅ ${table}: ${moved}건 이전 완료`);
  return moved;
}

(async () => {
  console.log(DRY ? "=== DRY RUN (실제 변경 없음) ===" : "=== 실제 이전 ===");

  await migrate("_backup_transcripts_20260720", [
    ["source_text", "source_text_encrypted"],
    ["translated_text", "translated_text_encrypted"],
  ]);
  await migrate("_backup_messages_20260720", [["message", "message_encrypted"]]);

  if (DRY) return;

  // 검증 — 표본 1건을 실제로 복호화해서 읽히는지 확인(암호문이 쓰레기가 아님을 증명).
  const { data: sample } = await db
    .from("_backup_transcripts_20260720")
    .select("id,source_text,source_text_encrypted")
    .not("source_text_encrypted", "is", null)
    .limit(1);
  if (sample?.length) {
    const s = sample[0] as any;
    try {
      const back = decryptString(s.source_text_encrypted);
      console.log(
        `\n🔎 표본 복호화 성공 (id=${s.id}): ${back.length}자 복원 · 평문컬럼=${s.source_text === null ? "비었음 ✅" : "🔴 남아있음"}`
      );
    } catch (e: any) {
      console.error(`\n🔴 표본 복호화 실패: ${e.message} — 형식이 앱과 다르다`);
      process.exit(1);
    }
  }
  console.log("\n완료.");
})();
