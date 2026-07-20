#!/usr/bin/env node
/**
 * backfill-transcript-encryption — 이미 쌓인 평문 상담 대화를 암호문으로 옮긴다 (POSTMORTEMS #102)
 *
 * 배경: 쓰기 경로는 암호문 저장으로 바꿨지만, 그 전에 쌓인 행(2026-07-20 기준 translations 460 /
 *   messages 10)은 여전히 평문이다. 읽기 경로가 평문 폴백을 하므로 화면은 멀쩡하지만,
 *   **DB 에 진단·병기가 평문으로 남아 있는 상태 자체가 위험**이라 옮겨야 한다.
 *
 * 안전 설계:
 *   · 한 행씩 "암호문 채우고 → 평문 지우기"를 **한 번의 UPDATE** 로. 중간에 죽어도
 *     평문만 남거나 암호문만 남는 어중간한 행이 안 생긴다(읽기는 둘 다 처리 가능).
 *   · **이미 암호문이 있는 행은 건너뛴다** — 재실행 안전(멱등). 중간에 끊겨도 다시 돌리면 된다.
 *   · `--dry` 로 먼저 몇 건인지만 확인. 기본은 dry 가 아니라 실제 실행이므로 주의.
 *   · 배치(기본 100) 단위로 처리하고 진행률을 찍는다.
 *
 * 사용 (tsx 필요 — encryptionV2 가 .ts 라 node 로는 못 읽는다):
 *   npx tsx scripts/backfill-transcript-encryption.mjs --dry     # 대상 건수만
npx tsx scripts/backfill-transcript-encryption.mjs           # 실제 이전
 *
 * ⚠️ 선행조건: migrations/20260720_transcript_encryption.sql 적용(평문 컬럼 NOT NULL 해제).
 *    안 하면 평문을 null 로 못 지운다.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ⚠️ src/lib/security/encryptionV2 를 직접 import 할 수 없다 — `server-only` 라 스크립트에서 throw.
//    그래서 **같은 형식**을 여기서 재현한다(선례: scripts/reencrypt-inquiries-email.mjs).
//    형식이 1바이트라도 다르면 앱이 복호화를 못 하므로, encryptionV2.encryptString 과 정확히 맞춘다:
//      JSON.stringify({ v:"v1", iv:base64(12B), tag:base64(16B), data:base64(ciphertext) })
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function keyBuffer() {
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

const DRY = process.argv.includes("--dry");
const BATCH = 100;

function env(key) {
  if (process.env[key]) return process.env[key];
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

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** @param {{table:string, fields:[string,string][]}} spec  fields = [평문컬럼, 암호문컬럼][] */
async function backfill(spec) {
  const { table, fields } = spec;
  const plainCols = fields.map(([p]) => p);
  const encCols = fields.map(([, e]) => e);
  const select = ["id", ...plainCols, ...encCols].join(",");

  // 대상: 평문이 있는데 암호문이 아직 없는 행(첫 필드 기준 — 쓰기는 항상 쌍으로 일어난다)
  const { count, error: cErr } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .not(plainCols[0], "is", null)
    .is(encCols[0], null);
  if (cErr) {
    console.error(`❌ ${table} 건수 조회 실패: ${cErr.message}`);
    return;
  }
  console.log(`\n[${table}] 이전 대상 ${count ?? 0}건`);
  if (DRY || !count) return;

  let done = 0;
  let failed = 0;
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .not(plainCols[0], "is", null)
      .is(encCols[0], null)
      .limit(BATCH);
    if (error) {
      console.error(`  조회 실패: ${error.message}`);
      break;
    }
    if (!data?.length) break;

    for (const row of data) {
      const patch = {};
      for (const [plain, enc] of fields) {
        const v = row[plain];
        patch[enc] = v == null ? null : encryptStringNullable(v);
        patch[plain] = null; // 같은 UPDATE 에서 평문 제거 → 중간 상태 없음
      }
      const { error: uErr } = await db.from(table).update(patch).eq("id", row.id);
      if (uErr) {
        failed++;
        console.error(`  ✗ ${row.id}: ${uErr.message}`);
      } else {
        done++;
      }
    }
    console.log(`  ... ${done}/${count} 완료${failed ? ` (실패 ${failed})` : ""}`);
    if (data.length < BATCH) break;
  }
  console.log(`[${table}] 완료 ${done}건${failed ? ` / 실패 ${failed}건` : ""}`);
}

console.log(DRY ? "— 미리보기(--dry): 아무것도 바꾸지 않습니다 —" : "— 실제 이전을 시작합니다 —");

await backfill({
  table: "consultation_translations",
  fields: [
    ["source_text", "source_text_encrypted"],
    ["translated_text", "translated_text_encrypted"],
  ],
});
await backfill({
  table: "consultation_messages",
  fields: [
    ["message", "message_encrypted"],
    ["translated_text", "translated_text_encrypted"],
  ],
});

console.log("\n끝. 확인: 평문이 남아 있으면 다시 실행하면 됩니다(멱등).");
