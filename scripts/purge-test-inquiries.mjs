#!/usr/bin/env node
/**
 * 「기계가 만든 시험 문의」 일괄 정리 (2026-08-25 PO 결정: 기계가 만든 것만).
 *
 * 판정 규칙은 코드 한 곳에만 있다 → src/lib/maintenance/testInquiryPurge.ts
 * (매일 도는 자동 청소도 같은 규칙을 본다. 갈라지면 한쪽만 고쳐진다.)
 *
 * 안전장치:
 *   · 기본이 «맛보기(dry-run)». 실제로 지우려면 --live 를 명시해야 한다.
 *   · 지우기 «전에» 대상 문의와 딸린 자료를 통째로 JSON 파일로 저장한다(--backup 경로).
 *     암호문은 암호문 그대로 저장된다(복호화해서 파일로 흘리지 않는다).
 *   · 실환자 문의(is_test=false)는 애초에 조회 대상이 아니다.
 *   · KEEP 목록(자동 검사가 여는 #17 · 시연 견본 #216 등)은 규칙에서 제외된다.
 *
 * 실행:
 *   node scripts/purge-test-inquiries.mjs                 # 맛보기(아무것도 안 지움)
 *   node scripts/purge-test-inquiries.mjs --live          # 백업 후 실제 삭제
 *   node scripts/purge-test-inquiries.mjs --live --older-than 30   # 30일 지난 것만
 *   node scripts/purge-test-inquiries.mjs --live --no-backup       # 자동 검사(CI)가 통과 직후 자기 자취 청소
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY_V1
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  isMachineMadeTestInquiry,
  isPurgeableNow,
  KEEP_INQUIRY_IDS,
  CHILD_TABLES_IN_ORDER,
} from "../src/lib/maintenance/testInquiryPurge.ts";

function loadDotenv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotenv();

const argv = process.argv.slice(2);
const LIVE = argv.includes("--live");
const olderIdx = argv.indexOf("--older-than");
const OLDER_THAN_DAYS = olderIdx >= 0 ? Number(argv[olderIdx + 1]) : null;
const NO_BACKUP = argv.includes("--no-backup"); // 자동 검사(CI)용 — 사라질 디스크에 백업해봐야 의미 없다
const backupIdx = argv.indexOf("--backup");
const BACKUP_PATH =
  backupIdx >= 0
    ? argv[backupIdx + 1]
    : path.join(process.cwd(), "..", `시험문의_백업_${new Date().toISOString().slice(0, 10)}.json`);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_KEY = process.env.ENCRYPTION_KEY_V1;

function dec(v) {
  if (!v || typeof v !== "string" || !v.startsWith('{"v":"v1"')) return v || "";
  try {
    const key = RAW_KEY.length === 64 ? Buffer.from(RAW_KEY, "hex") : Buffer.from(RAW_KEY, "base64");
    const p = JSON.parse(v);
    const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64"), { authTagLength: 16 });
    d.setAuthTag(Buffer.from(p.tag, "base64"));
    return d.update(p.data, "base64", "utf8") + d.final("utf8");
  } catch {
    return "";
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[중단] SUPABASE URL / SERVICE_ROLE_KEY 없음");
    process.exit(1);
  }
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await db
    .from("inquiries")
    .select("*")
    .eq("is_test", true)
    .order("id");
  if (error) throw new Error(`문의 조회 실패: ${error.message}`);

  const now = Date.now();
  const targets = (rows || []).filter((r) => {
    const cand = { id: r.id, isTest: r.is_test === true, email: dec(r.email), source: r.source, createdAt: r.created_at };
    return OLDER_THAN_DAYS ? isPurgeableNow(cand, now) : isMachineMadeTestInquiry(cand);
  });
  const ids = targets.map((r) => r.id);

  console.log(`[정리] 모드=${LIVE ? "실제 삭제" : "맛보기(아무것도 안 지움)"}`);
  console.log(`  시험 문의 전체 ${rows.length}건 중 대상 ${ids.length}건` +
    (OLDER_THAN_DAYS ? ` (${OLDER_THAN_DAYS}일 지난 것만)` : ""));
  console.log(`  남기는 것: ${Object.entries(KEEP_INQUIRY_IDS).map(([id, why]) => `#${id}(${why.slice(0, 20)}…)`).join(", ")}`);
  console.log(`  사람이 손으로 넣은 점검 문의는 대상이 아님 (PO 결정 2026-08-25)`);
  if (ids.length === 0) return;

  // ── 딸린 자료까지 모아 백업 ──────────────────────────────────
  const backup = { at: new Date().toISOString(), inquiries: targets, children: {} };
  const childSpecs = [
    ...CHILD_TABLES_IN_ORDER.map((t) => [t, "inquiry_id"]),
    ["chat_threads", "inquiry_id"],
    ["consultation_sessions", "inquiry_id"],
    ["surveys", "inquiry_id"],
    ["normalized_inquiries", "source_inquiry_id"],
  ];
  for (const [table, col] of childSpecs) {
    const { data } = await db.from(table).select("*").in(col, ids);
    if (data?.length) backup.children[table] = data;
  }
  const childCount = Object.entries(backup.children).map(([t, v]) => `${t} ${v.length}`).join(" · ");
  console.log(`  딸린 자료: ${childCount || "없음"}`);

  if (!LIVE) {
    console.log(`\n→ 실제로 지우려면 --live 를 붙여라. 그때 백업이 여기 저장된다: ${BACKUP_PATH}`);
    return;
  }

  if (NO_BACKUP) {
    console.log("  백업 안 함(--no-backup) — 자동 검사가 방금 만든 자취를 지우는 용도");
  } else {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), "utf8");
    console.log(`  백업 저장: ${BACKUP_PATH} (${(fs.statSync(BACKUP_PATH).size / 1024).toFixed(0)}KB)`);
  }

  // ── 삭제 순서 ────────────────────────────────────────────────
  // ⚠️ 2026-08-25 실패에서 배운 순서: 대화(chat_threads)를 «먼저» 지우면 실패한다 —
  //    inquiries.ai_chat_thread_id 가 그 대화를 붙잡고 있기 때문이다. 그래서
  //    ①문의의 자식 표 → ②문의 → ③주인 없어진 대화(메시지·추천답장 사용기록 포함) 순서로 간다.
  //    그리고 **모든 삭제의 오류를 확인한다** — 첫 판은 오류를 안 봐서 대화 28건이
  //    「지웠다」고 찍히고 실제로는 고아로 남았다.
  const fail = (what, e) => { throw new Error(`${what} 삭제 실패: ${e.message}`); };

  const surveyIds = (backup.children.surveys || []).map((s) => s.id);
  if (surveyIds.length) {
    const { error: e1 } = await db.from("survey_responses").delete().in("survey_id", surveyIds);
    if (e1) fail("설문 응답", e1);
    const { error: e2 } = await db.from("surveys").delete().in("id", surveyIds);
    if (e2) fail("설문", e2);
    console.log(`  설문 ${surveyIds.length}건 삭제`);
  }

  const normIds = (backup.children.normalized_inquiries || []).map((n) => n.id);
  if (normIds.length) {
    const { error: e3 } = await db.from("hospital_leads").delete().in("normalized_inquiry_id", normIds);
    if (e3) fail("병원 리드", e3);
    const { error: e4 } = await db.from("normalized_inquiries").delete().in("id", normIds);
    if (e4) fail("정규화 문의", e4);
    console.log(`  정규화 문의 ${normIds.length}건 삭제`);
  }

  const sessionIds = (backup.children.consultation_sessions || []).map((s) => s.id);
  if (sessionIds.length) {
    for (const t of ["consultation_admissions", "consultation_documents", "consultation_guest_tokens",
                     "consultation_messages", "consultation_recordings", "consultation_translations"]) {
      const { error } = await db.from(t).delete().in("consultation_session_id", sessionIds);
      if (error) console.warn(`  (건너뜀) ${t}: ${error.message}`);
    }
    const { error: e5 } = await db.from("consultation_sessions").delete().in("id", sessionIds);
    if (e5) fail("상담방", e5);
    console.log(`  상담방 ${sessionIds.length}건 삭제`);
  }

  for (const table of CHILD_TABLES_IN_ORDER) {
    const { error } = await db.from(table).delete().in("inquiry_id", ids);
    if (error) console.warn(`  (건너뜀) ${table}: ${error.message}`);
  }

  const { error: delErr, count } = await db.from("inquiries").delete({ count: "exact" }).in("id", ids);
  if (delErr) fail("문의", delErr);
  const removed = count ?? ids.length;

  // 주인이 없어진 대화 — 메시지를 붙잡고 있는 「추천 답장 사용기록」부터 푼다.
  const threadIds = (backup.children.chat_threads || []).map((t) => t.id);
  if (threadIds.length) {
    const { data: msgs } = await db.from("chat_messages").select("id").in("thread_id", threadIds);
    const msgIds = (msgs || []).map((m) => m.id);
    if (msgIds.length) {
      const { error: e6 } = await db.from("playbook_usage_events").delete().in("message_id", msgIds);
      if (e6) fail("추천답장 사용기록", e6);
      const { error: e7 } = await db.from("chat_messages").delete().in("thread_id", threadIds);
      if (e7) fail("대화 메시지", e7);
    }
    const { error: e8 } = await db.from("chat_threads").delete().in("id", threadIds);
    if (e8) fail("대화", e8);
    console.log(`  대화 ${threadIds.length}건(메시지 ${msgIds.length}건) 삭제`);
  }

  console.log(
    `
[정리] 문의 ${removed}건 삭제 완료.` +
      (NO_BACKUP ? " (백업 안 함 — 자동 검사용 실행)" : ` 되돌리려면 백업 파일을 쓴다: ${BACKUP_PATH}`)
  );
}

main().catch((e) => {
  console.error("[예외]", e.message);
  process.exit(1);
});
