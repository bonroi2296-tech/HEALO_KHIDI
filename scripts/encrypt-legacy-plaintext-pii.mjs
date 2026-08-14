#!/usr/bin/env node
/**
 * 암호화 도입 «전»에 들어와 평문으로 남아 있는 환자 개인정보를 지금 형식으로 잠근다.
 *
 * 왜 필요한가 (2026-08-13 「환자 개인정보 나가는 길」 전수 점검, PO 지시):
 *   지금 코드는 저장할 때 전부 AES-256-GCM 으로 잠근다(`encryptString`).
 *   그런데 2026-05~06 에 들어온 행 일부가 «평문 그대로» 남아 있었다(실측 7건).
 *   화면·API 는 옛 평문도 그대로 읽어주도록 만들어져 있어(`decryptMaybe`) 눈에 안 띄었을 뿐,
 *   DB 사본·백업이 새면 그 행들만 바로 읽힌다.
 *   PO 결정(2026-08-13): 「전부 암호화로 바꾼다」. 값은 그대로, 자물쇠만 채운다.
 *
 * 어떻게 판정하나:
 *   지금 형식의 암호문은 항상 `{"v":"v1",...}` JSON 문자열이다.
 *   그 형태가 «아닌» 값 = 평문. (판정이 한 줄이라 오작동 여지가 적다.)
 *
 * 안전장치:
 *   - 기본이 «맛보기(dry-run)». 실제로 쓰려면 `--live` 를 명시해야 한다.
 *   - 값은 화면에 안 찍는다(앞 한 글자만).
 *   - 잠근 직후 «다시 풀어» 원래 값과 같은지 대조하고, 다르면 그 행은 되돌린다.
 *     (열쇠가 잘못 들어와도 읽을 수 없는 쓰레기가 남지 않게.)
 *
 * 실행:
 *   node scripts/encrypt-legacy-plaintext-pii.mjs            # 맛보기(아무것도 안 바꿈)
 *   node scripts/encrypt-legacy-plaintext-pii.mjs --live     # 실제 적용
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY_V1
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function loadDotenv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv();

const LIVE = process.argv.includes("--live");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_KEY = process.env.ENCRYPTION_KEY_V1;

// 어느 표의 어느 칸을 볼지 — 환자 개인정보만. (직원 계정 이메일은 로그인 정보라 대상 아님.)
const TARGETS = [
  { table: "inquiries", idCol: "id", cols: ["email", "first_name", "last_name", "contact_id"] },
  { table: "chat_threads", idCol: "id", cols: ["guest_email", "guest_name", "guest_phone"] },
];

function keyBuffer() {
  if (!RAW_KEY) throw new Error("ENCRYPTION_KEY_V1 없음");
  if (RAW_KEY.length >= 43 && RAW_KEY.length <= 44) {
    const b = Buffer.from(RAW_KEY, "base64");
    if (b.length === 32) return b;
  }
  if (RAW_KEY.length === 64) {
    const b = Buffer.from(RAW_KEY, "hex");
    if (b.length === 32) return b;
  }
  throw new Error("ENCRYPTION_KEY_V1 형식이 32바이트가 아니다(base64 44자 또는 hex 64자)");
}

// src/lib/security/encryptionV2.ts 의 encryptString 과 «같은» 형식이어야 한다.
function encryptString(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  let data = cipher.update(plaintext, "utf8", "base64");
  data += cipher.final("base64");
  return JSON.stringify({ v: "v1", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data });
}

function decryptString(payloadJson, key) {
  const p = JSON.parse(payloadJson);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64"), { authTagLength: 16 });
  decipher.setAuthTag(Buffer.from(p.tag, "base64"));
  let out = decipher.update(p.data, "base64", "utf8");
  out += decipher.final("utf8");
  return out;
}

const isPlaintext = (v) => typeof v === "string" && v.length > 0 && !v.startsWith('{"v":"v1"');
const hint = (v) => (v ? String(v).slice(0, 1) + "***" : "");

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[중단] SUPABASE URL / SERVICE_ROLE_KEY 가 없다");
    process.exit(1);
  }
  const key = keyBuffer();
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log(`[평문잠그기] 모드=${LIVE ? "실제적용" : "맛보기(아무것도 안 바꿈)"}`);
  let found = 0, done = 0, failed = 0;

  for (const t of TARGETS) {
    const { data: rows, error } = await db.from(t.table).select([t.idCol, ...t.cols].join(", "));
    if (error) {
      console.error(`[중단] ${t.table} 조회 실패: ${error.message}`);
      process.exit(1);
    }
    for (const row of rows || []) {
      const patch = {};
      for (const c of t.cols) {
        if (!isPlaintext(row[c])) continue;
        found++;
        const enc = encryptString(row[c], key);
        // 잠근 직후 다시 풀어 원본과 대조 — 안 맞으면 이 행은 건드리지 않는다.
        if (decryptString(enc, key) !== row[c]) {
          console.error(`  [실패] ${t.table}#${row[t.idCol]} ${c}: 되풀기 대조 불일치 → 건너뜀`);
          failed++;
          continue;
        }
        patch[c] = enc;
        console.log(`  ${LIVE ? "잠금" : "잠글 예정"}: ${t.table}#${row[t.idCol]} ${c}=${hint(row[c])}`);
      }
      if (Object.keys(patch).length === 0) continue;
      if (!LIVE) { done += Object.keys(patch).length; continue; }
      const { error: upErr } = await db.from(t.table).update(patch).eq(t.idCol, row[t.idCol]);
      if (upErr) {
        console.error(`  [실패] ${t.table}#${row[t.idCol]}: ${upErr.message}`);
        failed += Object.keys(patch).length;
      } else {
        done += Object.keys(patch).length;
      }
    }
  }

  console.log(`\n[평문잠그기] 찾음 ${found}칸 / ${LIVE ? "잠금" : "잠글 예정"} ${done}칸 / 실패 ${failed}칸`);
  if (failed > 0) process.exit(1);
  if (!LIVE && found > 0) console.log("→ 실제로 적용하려면 --live 를 붙여 다시 실행.");
}

main().catch((e) => {
  console.error("[예외]", e.message);
  process.exit(1);
});
