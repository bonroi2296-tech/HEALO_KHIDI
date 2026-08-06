#!/usr/bin/env node
/**
 * dump-consultation — 화상상담 한 건의 자막·소견을 «사람이 읽을 수 있게» 풀어서 찍는다.
 *
 * 왜 필요한가: 자막(consultation_translations)과 소견(case_opinions)은 DB 에 암호문으로 들어 있어
 *   SQL 로 열어봐도 안 읽힌다. 상담 뒤 「환자에게 뭘 전달할지」를 정하려면 원문을 봐야 한다.
 *
 * 사용:
 *   node scripts/dump-consultation.mjs <session_id>          # 자막 전체 + 그 문의의 소견
 *   node scripts/dump-consultation.mjs --inquiry 60          # 문의 번호로 (가장 최근 상담)
 *
 * ⚠️ 출력에 환자 실명·진단이 그대로 나온다. 파일로 남기면 그 파일도 개인정보다 — 보고 지워라.
 */
import fs from "node:fs";
import crypto from "node:crypto";
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

const keyBuf = Buffer.from(env("ENCRYPTION_KEY_V1") || "", "base64");
if (keyBuf.length !== 32) {
  console.error("❌ ENCRYPTION_KEY_V1 없음/길이 틀림 — 앱과 같은 키여야 읽힌다");
  process.exit(1);
}

/** 암호문 JSON → 평문. 평문이 그대로 들어 있으면 그대로 돌려준다(옛 행 폴백). */
function decrypt(value) {
  if (value == null || value === "") return null;
  let p;
  try {
    p = JSON.parse(value);
  } catch {
    return value; // 평문 폴백
  }
  if (!p || p.v !== "v1" || !p.iv || !p.tag || !p.data) return value;
  const d = crypto.createDecipheriv("aes-256-gcm", keyBuf, Buffer.from(p.iv, "base64"), {
    authTagLength: 16,
  });
  d.setAuthTag(Buffer.from(p.tag, "base64"));
  return d.update(p.data, "base64", "utf8") + d.final("utf8");
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
let sessionId = args.find((a) => !a.startsWith("--"));
const inquiryFlag = args.indexOf("--inquiry");

if (inquiryFlag >= 0) {
  const inquiryId = Number(args[inquiryFlag + 1]);
  const { data } = await db
    .from("consultation_sessions")
    .select("id, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false })
    .limit(1);
  sessionId = data?.[0]?.id;
  if (!sessionId) {
    console.error(`❌ 문의 #${inquiryId} 에 붙은 상담이 없다`);
    process.exit(1);
  }
}
if (!sessionId) {
  console.error("사용법: node scripts/dump-consultation.mjs <session_id> | --inquiry <번호>");
  process.exit(1);
}

const { data: s } = await db
  .from("consultation_sessions")
  .select("id, inquiry_id, status, started_at, ended_at, patient_language, notes, notes_encrypted")
  .eq("id", sessionId)
  .single();

console.log(`# 상담 ${s.id}  (문의 #${s.inquiry_id})`);
console.log(`시작 ${s.started_at} / 종료 ${s.ended_at} / 상태 ${s.status}\n`);

const notes = decrypt(s.notes_encrypted) ?? s.notes;
if (notes) console.log(`## 코디 메모\n${notes}\n`);

const { data: rows } = await db
  .from("consultation_translations")
  .select("created_at, speaker_name, source_lang, target_lang, source_text, source_text_encrypted, translated_text, translated_text_encrypted")
  .eq("session_id", sessionId)
  .order("created_at", { ascending: true });

console.log(`## 자막 ${rows.length}줄  (⚠️ 받아쓰기 오류·지어낸 말이 섞일 수 있다 — 그대로 옮기지 마라)\n`);
for (const r of rows) {
  const src = decrypt(r.source_text_encrypted) ?? r.source_text ?? "";
  const dst = decrypt(r.translated_text_encrypted) ?? r.translated_text ?? "";
  const t = new Date(r.created_at).toISOString().slice(11, 19);
  console.log(`[${t}] ${r.speaker_name ?? "?"} (${r.source_lang}→${r.target_lang})`);
  console.log(`  원문: ${src}`);
  if (dst && dst !== src) console.log(`  번역: ${dst}`);
}

const { data: ops } = await db
  .from("case_opinions")
  .select("id, doctor_name, opinion_text, auto_translated_text, released_text, released_at, created_at")
  .eq("inquiry_id", s.inquiry_id)
  .order("created_at", { ascending: true });

for (const o of ops ?? []) {
  console.log(`\n## 소견 — ${o.doctor_name} (${o.created_at}) ${o.released_at ? "[공개됨]" : "[미공개]"}`);
  console.log(decrypt(o.opinion_text));
  if (o.released_text) console.log(`\n### 공개본\n${decrypt(o.released_text)}`);
}
