import "server-only";

/**
 * healwith: 스태프 텔레그램 릴레이 — 봇 문의를 코디의 텔레그램에서 보고 "거기서 바로 답장"
 * (PO 결정 2026-07-24: B안 — 인앱 확인에 더해 텔레그램 양방향)
 *
 * 구조: 스태프 전용 텔레그램 그룹(주제/Topics 켠 수퍼그룹)에 @healwith_bot(환자 봇과 동일
 * 토큰)을 관리자로 초대 → 환자 스레드 1개 = 그룹 주제(topic) 1개.
 *  - 인바운드: 환자·AI·웹 코디 메시지를 해당 주제로 릴레이(웹훅·어드민 라우트가 호출).
 *  - 아웃바운드: 스태프가 주제에 쓴 글 → 웹훅이 스레드로 역매핑 → 환자 메신저로 발신
 *    (텔레그램·왓츠앱 공통 — 처리부는 webhooks/telegram 라우트).
 *
 * env: STAFF_TELEGRAM_GROUP_ID (그룹 chat_id, 보통 -100 으로 시작) — 미설정이면 전부 조용히
 * 스킵(기존 동작 무변경). 토큰은 TELEGRAM_PATIENT_BOT_TOKEN 재사용(봇 하나가 두 역할).
 *
 * ⚠️ 개통 절차·봇 privacy 설정(/setprivacy Disable 필수)은 docs/TELEGRAM_BOT_SETUP.md §스태프 그룹.
 * ⚠️ PII: B안 채택으로 환자 메시지 본문이 스태프 그룹에 흐른다(PO 승인 2026-07-24) — 그룹
 *    멤버는 스태프만(그룹 초대 관리 = 운영 책임), 첨부 파일은 릴레이하지 않음(v1 텍스트만).
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";

const TG_API = "https://api.telegram.org";

export function staffGroupId(): string | null {
  const id = (process.env.STAFF_TELEGRAM_GROUP_ID || "").trim();
  return id || null;
}

export function isStaffRelayConfigured(): boolean {
  return !!(staffGroupId() && process.env.TELEGRAM_PATIENT_BOT_TOKEN);
}

async function callBotApi(method: string, payload: Record<string, any>): Promise<any | null> {
  const token = process.env.TELEGRAM_PATIENT_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${TG_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      // 본문엔 chat_id 등이 섞일 수 있어 상태·오류코드만 로그(PII·토큰 금지).
      console.error(`[staffRelay] ${method} failed: ${res.status} code=${body?.error_code ?? "?"}`);
      return null;
    }
    return body.result;
  } catch (e: any) {
    console.error(`[staffRelay] ${method} exception:`, e?.message);
    return null;
  }
}

function threadMeta(thread: any): Record<string, any> {
  return thread?.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
    ? thread.metadata
    : {};
}

// 주제 이름 — PII 없이 식별 가능한 최소 정보(채널·언어·스레드 축약 id).
function topicName(thread: any): string {
  const meta = threadMeta(thread);
  const ch = thread?.channel === "whatsapp" ? "WA" : thread?.channel === "telegram" ? "TG" : "WEB";
  const lang = String(meta.language || "?").toUpperCase();
  return `${ch}·${lang}·#${String(thread?.id || "").slice(0, 8)}`;
}

/**
 * 스레드의 스태프 주제(topic) id 확보 — 없으면 생성하고 metadata.staff_topic_id 에 기록.
 * 조건부 UPDATE(아직 없을 때만)로 병렬 생성 경쟁을 직렬화 — 진 쪽은 이긴 쪽 값을 다시 읽는다.
 */
export async function ensureStaffTopic(thread: any): Promise<number | null> {
  const gid = staffGroupId();
  if (!gid) return null;
  const meta = threadMeta(thread);
  if (meta.staff_topic_id) return Number(meta.staff_topic_id);

  const created = await callBotApi("createForumTopic", { chat_id: gid, name: topicName(thread) });
  const topicId = Number(created?.message_thread_id) || null;
  if (!topicId) return null;

  const { data: won } = await (supabaseAdmin as any)
    .from("chat_threads")
    .update({ metadata: { ...meta, staff_topic_id: topicId } })
    .eq("id", thread.id)
    .is("metadata->>staff_topic_id", null)
    .select("id");
  if (won?.length) return topicId;

  // 경쟁에서 짐 — 이긴 쪽 topic 을 쓴다(내가 만든 주제는 빈 채로 남지만 무해).
  const { data: fresh } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("metadata")
    .eq("id", thread.id)
    .single();
  return Number(fresh?.metadata?.staff_topic_id) || topicId;
}

/**
 * 스태프 그룹 주제로 텍스트 릴레이(fail-safe — 실패해도 메인 흐름에 영향 없음).
 * who 예: "🧑 환자" / "🤖 AI" / "🧑‍💼 코디(관리자화면)" / "🙋 시스템".
 */
export async function relayToStaffTopic(thread: any, who: string, text: string): Promise<void> {
  try {
    if (!isStaffRelayConfigured()) return;
    const topicId = await ensureStaffTopic(thread);
    if (!topicId) return;
    const body = `${who}\n${String(text || "").slice(0, 3800)}`;
    await callBotApi("sendMessage", {
      chat_id: staffGroupId(),
      message_thread_id: topicId,
      text: body,
      disable_web_page_preview: true,
    });
  } catch (e: any) {
    console.error("[staffRelay] relay 실패(무시):", e?.message);
  }
}

/** 주제(topic)에 직접 한 줄 공지(스레드 없이) — 라우팅 실패 안내 등. fail-safe. */
export async function notifyStaffTopic(topicId: number, text: string): Promise<void> {
  const gid = staffGroupId();
  if (!gid || !topicId) return;
  await callBotApi("sendMessage", {
    chat_id: gid,
    message_thread_id: topicId,
    text: String(text || "").slice(0, 3800),
    disable_web_page_preview: true,
  });
}

/** 주제 id → 스레드 역매핑(스태프 답장 라우팅). */
export async function findThreadByStaffTopic(topicId: number): Promise<any | null> {
  const { data } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("*")
    .eq("metadata->>staff_topic_id", String(topicId))
    .not("status", "in", "(resolved,closed)")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}
