#!/usr/bin/env node
/**
 * HEALO: inquiries.email 평문 → encrypted_email (jsonb AES-256-GCM) 일괄 이관
 *
 * 목적:
 * - `inquiries` 테이블에 `email` 평문 컬럼과 `encrypted_email` jsonb 가 공존
 * - 과거 데이터는 평문만 있고 암호화본 NULL 인 row 가 있을 수 있음
 * - 평문 DROP 마이그레이션 실행 전에 이 스크립트로 전부 암호화본으로 이관
 *
 * 실행:
 *   node scripts/reencrypt-inquiries-email.mjs [--dry-run]
 *
 * 환경변수 (.env.local 필요):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SUPABASE_ENCRYPTION_KEY (또는 ENCRYPTION_KEY_V2, 64-char hex)
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// --env-local 로드 (tsx 와 dotenv 없이 최소 구현)
function loadDotenv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv();

const DRY_RUN = process.argv.includes("--dry-run");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENC_KEY = process.env.SUPABASE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY_V2;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[abort] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
if (!ENC_KEY || ENC_KEY.length !== 64) {
  console.error("[abort] SUPABASE_ENCRYPTION_KEY (64-char hex) 필요");
  process.exit(1);
}

const keyBuf = Buffer.from(ENC_KEY, "hex");

function encryptAES256GCM(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 2,
    iv: iv.toString("base64"),
    ct: encrypted.toString("base64"),
    tag: tag.toString("base64"),
    alg: "AES-256-GCM",
  };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`[reencrypt] mode=${DRY_RUN ? "DRY-RUN" : "LIVE"}`);
  console.log("[reencrypt] fetching rows with plaintext email but NULL encrypted_email...");

  const { data: rows, error } = await supabase
    .from("inquiries")
    .select("id, email, encrypted_email")
    .not("email", "is", null)
    .is("encrypted_email", null);

  if (error) {
    console.error("[abort] select failed:", error.message);
    process.exit(1);
  }

  console.log(`[reencrypt] ${rows.length} rows to migrate`);

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.email || typeof row.email !== "string") continue;

    try {
      const encrypted = encryptAES256GCM(row.email);

      if (DRY_RUN) {
        console.log(`  would update row id=${row.id} email=${row.email.slice(0, 3)}***`);
        success++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from("inquiries")
        .update({ encrypted_email: encrypted })
        .eq("id", row.id);

      if (updateErr) {
        console.error(`  [failed] row id=${row.id}: ${updateErr.message}`);
        failed++;
      } else {
        success++;
        if (success % 10 === 0) console.log(`  progress: ${success}/${rows.length}`);
      }
    } catch (e) {
      console.error(`  [exception] row id=${row.id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`[done] success=${success} failed=${failed}`);

  if (!DRY_RUN && failed === 0) {
    console.log("[next] 이제 migrations/20260420_drop_inquiries_plaintext_email.sql 실행 가능");
  }
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
