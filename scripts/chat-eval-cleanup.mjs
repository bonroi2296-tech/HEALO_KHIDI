#!/usr/bin/env node
/**
 * chat-eval 잔여 데이터 청소. 평가 러너가 만든 eval 스레드(guest_country="__EVAL__")와
 * 그 메시지·judge 평가행을 실DB에서 지운다. (≤2턴이라 inquiry 승격은 안 일어나 KHIDI 무관.)
 *
 * 사용: node scripts/chat-eval-cleanup.mjs            # 미리보기(건수만)
 *       node scripts/chat-eval-cleanup.mjs --yes      # 실제 삭제
 *
 * 키: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local 에서 읽음).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVAL_TAG = "__EVAL__";
const APPLY = process.argv.includes("--yes");

(function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "").trim();
  }
})();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: threads, error } = await db.from("chat_threads").select("id").eq("guest_country", EVAL_TAG);
if (error) { console.error("조회 실패:", error.message); process.exit(1); }
const ids = (threads || []).map((t) => t.id);
console.log(`eval 스레드 ${ids.length}개 발견 (tag=${EVAL_TAG})`);
if (ids.length === 0) process.exit(0);

if (!APPLY) {
  console.log("미리보기 모드. 실제 삭제하려면 --yes 를 붙이세요.");
  process.exit(0);
}

// 의존행 먼저 → 스레드 (FK cascade 가 없을 수 있어 순서대로)
// playbook_usage_events 가 chat_messages.id 를 FK 로 참조 — 메시지보다 먼저 지워야 함
// (2026-07-04 실측: 이 단계가 없으면 23503 FK 위반으로 청소 전체가 막힘).
{
  const { data: msgRows } = await db.from("chat_messages").select("id").in("thread_id", ids);
  const msgIds = (msgRows || []).map((m) => m.id).filter(Boolean);
  if (msgIds.length > 0) {
    const { error: pe, count: pc } = await db
      .from("playbook_usage_events")
      .delete({ count: "exact" })
      .in("message_id", msgIds);
    if (pe) console.warn(`  ⚠️ playbook_usage_events: ${pe.message}`);
    else console.log(`  playbook_usage_events: ${pc ?? 0}행 삭제`);
  }
}
for (const table of ["chat_messages", "ai_response_evaluations"]) {
  const { error: e, count } = await db.from(table).delete({ count: "exact" }).in("thread_id", ids);
  if (e) console.warn(`  ⚠️ ${table}: ${e.message}`);
  else console.log(`  ${table}: ${count ?? 0}행 삭제`);
}
const { error: te, count: tc } = await db.from("chat_threads").delete({ count: "exact" }).eq("guest_country", EVAL_TAG);
if (te) { console.error("chat_threads 삭제 실패:", te.message); process.exit(1); }
console.log(`  chat_threads: ${tc ?? 0}행 삭제`);
console.log("청소 완료.");
