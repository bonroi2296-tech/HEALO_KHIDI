/**
 * healwith: 문의와 딸린 자료를 «순서대로» 지우는 한 곳.
 *
 * 왜 함수로 뺐나 (2026-08-25): 일괄 정리 스크립트와 매일 도는 자동 청소가 각자 지우면
 * 순서가 갈라진다. 실제로 첫 판에서 대화를 먼저 지우려다 실패했고, 오류를 안 봐서
 * 「지웠다」고 찍힌 채 고아 대화 28건이 남았다. 순서와 오류검사를 여기 한 곳에 둔다.
 *
 * 순서가 중요한 이유:
 *   · `inquiries.ai_chat_thread_id` 가 대화를 붙잡는다 → 대화는 문의를 지운 «뒤»에.
 *   · `playbook_usage_events.message_id` 가 메시지를 붙잡는다 → 사용기록을 먼저.
 *   · CASCADE 가 안 걸린 표(상담방·설문·사후관리 일정·인테이크·정규화 문의)는 직접 지운다.
 */

import "server-only";
import { CHILD_TABLES_IN_ORDER } from "./testInquiryPurge";

export interface PurgeResult {
  inquiries: number;
  threads: number;
  messages: number;
  warnings: string[];
}

/** 지정한 문의 id 들을 딸린 자료까지 지운다. 실패하면 그 자리에서 throw (조용한 실패 금지). */
export async function purgeInquiriesDeep(db: any, ids: number[]): Promise<PurgeResult> {
  const out: PurgeResult = { inquiries: 0, threads: 0, messages: 0, warnings: [] };
  if (!ids.length) return out;

  const fail = (what: string, e: any) => {
    throw new Error(`${what} 삭제 실패: ${e.message}`);
  };
  const idsOf = async (table: string, col: string) => {
    const { data, error } = await db.from(table).select("id").in(col, ids);
    if (error) fail(`${table} 조회`, error);
    return (data || []).map((r: any) => r.id);
  };

  // 1) 설문 → 응답부터
  const surveyIds = await idsOf("surveys", "inquiry_id");
  if (surveyIds.length) {
    const { error: e1 } = await db.from("survey_responses").delete().in("survey_id", surveyIds);
    if (e1) fail("설문 응답", e1);
    const { error: e2 } = await db.from("surveys").delete().in("id", surveyIds);
    if (e2) fail("설문", e2);
  }

  // 2) 정규화 문의 → 병원 리드부터
  const { data: normRows, error: normErr } = await db
    .from("normalized_inquiries")
    .select("id")
    .in("source_inquiry_id", ids);
  if (normErr) fail("정규화 문의 조회", normErr);
  const normIds = (normRows || []).map((r: any) => r.id);
  if (normIds.length) {
    const { error: e3 } = await db.from("hospital_leads").delete().in("normalized_inquiry_id", normIds);
    if (e3) fail("병원 리드", e3);
    const { error: e4 } = await db.from("normalized_inquiries").delete().in("id", normIds);
    if (e4) fail("정규화 문의", e4);
  }

  // 3) 상담방 → 딸린 표부터
  const sessionIds = await idsOf("consultation_sessions", "inquiry_id");
  if (sessionIds.length) {
    for (const t of [
      "consultation_admissions",
      "consultation_documents",
      "consultation_guest_tokens",
      "consultation_messages",
      "consultation_recordings",
      "consultation_translations",
    ]) {
      const { error } = await db.from(t).delete().in("consultation_session_id", sessionIds);
      if (error) out.warnings.push(`${t}: ${error.message}`);
    }
    const { error: e5 } = await db.from("consultation_sessions").delete().in("id", sessionIds);
    if (e5) fail("상담방", e5);
  }

  // 4) 나머지 자식 표 (CASCADE 가 걸린 것도 명시적으로)
  for (const table of CHILD_TABLES_IN_ORDER) {
    const { error } = await db.from(table).delete().in("inquiry_id", ids);
    if (error) out.warnings.push(`${table}: ${error.message}`);
  }

  // 5) 대화 id 를 «미리» 모아둔다 — 문의를 지우면 연결이 끊겨 못 찾는다.
  const threadIds = await idsOf("chat_threads", "inquiry_id");

  // 6) 문의
  const { error: delErr, count } = await db
    .from("inquiries")
    .delete({ count: "exact" })
    .in("id", ids);
  if (delErr) fail("문의", delErr);
  out.inquiries = count ?? ids.length;

  // 7) 주인 없어진 대화 → 사용기록·메시지부터
  if (threadIds.length) {
    const { data: msgs, error: mErr } = await db.from("chat_messages").select("id").in("thread_id", threadIds);
    if (mErr) fail("대화 메시지 조회", mErr);
    const msgIds = (msgs || []).map((m: any) => m.id);
    if (msgIds.length) {
      const { error: e6 } = await db.from("playbook_usage_events").delete().in("message_id", msgIds);
      if (e6) fail("추천답장 사용기록", e6);
      const { error: e7 } = await db.from("chat_messages").delete().in("thread_id", threadIds);
      if (e7) fail("대화 메시지", e7);
    }
    const { error: e8 } = await db.from("chat_threads").delete().in("id", threadIds);
    if (e8) fail("대화", e8);
    out.threads = threadIds.length;
    out.messages = msgIds.length;
  }

  return out;
}
