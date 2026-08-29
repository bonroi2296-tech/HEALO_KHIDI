#!/usr/bin/env node
/**
 * 상담 대화록·대기실·세션의 평문 PII 를 «암호문 칸으로 옮기고 평문 칸을 비운다».
 *
 * 왜 (2026-08-14 보안감사, PO 지시 「환자 개인정보 평문 암호화」):
 *   내용(source_text/translated_text)·메모(notes)는 이미 암호화돼 있는데
 *   ① consultation_translations.speaker_name (화자 = 환자 실명) 2,020행
 *   ② consultation_admissions.display_name (대기실 입장자 이름) 288행
 *   ③ consultation_sessions.clinical_summary·recommendations (진단·병기·치료계획)
 *   이 셋만 평문으로 남아 있었다. 코드는 이제 새 값은 암호문 칸에 넣고, 조회 시
 *   기회주의적으로 옮긴다 — 다만 대화록 조회가 드물어 기존 대량 행은 이 스크립트로 한 번에 옮긴다.
 *
 * 「같은 칸 암호화」가 아니라 「plain → *_encrypted 이전 + plain=null」이라
 *   scripts/encrypt-legacy-plaintext-pii.mjs 와 구조가 달라 따로 둔다.
 *
 * 안전장치(기존 스크립트와 동일):
 *   - 기본이 «맛보기(dry-run)». 실제 적용은 `--live` 명시.
 *   - 값은 안 찍는다(앞 한 글자만).
 *   - 잠근 직후 다시 풀어 원값과 대조, 다르면 그 행은 건너뛴다.
 *   - 암호문 칸이 이미 있으면(이미 이전됨) 건드리지 않는다.
 *
 * 실행:
 *   node scripts/encrypt-consult-transcript-pii.mjs          # 맛보기
 *   node scripts/encrypt-consult-transcript-pii.mjs --live   # 실제 적용
 *
 * 환경변수: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY_V1
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

// 표별로 「평문 칸 → 암호문 칸」 이전 목록.
const TARGETS = [
  { table: "consultation_translations", idCol: "id", moves: [["speaker_name", "speaker_name_encrypted"]] },
  { table: "consultation_admissions", idCol: "id", moves: [["display_name", "display_name_encrypted"]] },
  {
    table: "consultation_sessions",
    idCol: "id",
    moves: [["clinical_summary", "clinical_summary_encrypted"], ["recommendations", "recommendations_encrypted"]],
  },
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

// src/lib/security/encryptionV2.ts 의 형식과 «같아야» 한다.
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
const PAGE = 500;

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[중단] SUPABASE URL / SERVICE_ROLE_KEY 가 없다");
    process.exit(1);
  }
  const key = keyBuffer();
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log(`[상담PII잠그기] 모드=${LIVE ? "실제적용" : "맛보기(아무것도 안 바꿈)"}`);
  let found = 0, done = 0, failed = 0;

  for (const t of TARGETS) {
    const plainCols = t.moves.map((m) => m[0]);
    const encCols = t.moves.map((m) => m[1]);
    const selectCols = [t.idCol, ...plainCols, ...encCols].join(", ");

    for (let from = 0; ; from += PAGE) {
      const { data: rows, error } = await db
        .from(t.table)
        .select(selectCols)
        .range(from, from + PAGE - 1);
      if (error) {
        console.error(`[중단] ${t.table} 조회 실패: ${error.message}`);
        process.exit(1);
      }
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        const patch = {};
        for (const [plain, enc] of t.moves) {
          if (row[enc]) continue;            // 이미 암호문 있음 → 건너뜀(이중 변환 방지)
          if (!isPlaintext(row[plain])) continue;
          found++;
          const ciphertext = encryptString(row[plain], key);
          if (decryptString(ciphertext, key) !== row[plain]) {
            console.error(`  [실패] ${t.table}#${row[t.idCol]} ${plain}: 되풀기 대조 불일치 → 건너뜀`);
            failed++;
            continue;
          }
          patch[enc] = ciphertext;
          patch[plain] = null;
          console.log(`  ${LIVE ? "잠금" : "잠글 예정"}: ${t.table}#${row[t.idCol]} ${plain}=${hint(row[plain])}`);
        }
        if (Object.keys(patch).length === 0) continue;
        const encChanged = Object.keys(patch).filter((k) => encCols.includes(k)).length;
        if (!LIVE) { done += encChanged; continue; }
        const { error: upErr } = await db.from(t.table).update(patch).eq(t.idCol, row[t.idCol]);
        if (upErr) {
          console.error(`  [실패] ${t.table}#${row[t.idCol]}: ${upErr.message}`);
          failed += encChanged;
        } else {
          done += encChanged;
        }
      }
      if (rows.length < PAGE) break;
    }
  }

  console.log(`\n[상담PII잠그기] 찾음 ${found}칸 / ${LIVE ? "잠금" : "잠글 예정"} ${done}칸 / 실패 ${failed}칸`);
  if (failed > 0) process.exit(1);
  if (!LIVE && found > 0) console.log("→ 실제로 적용하려면 --live 를 붙여 다시 실행.");
}

main().catch((e) => {
  console.error("[예외]", e.message);
  process.exit(1);
});
