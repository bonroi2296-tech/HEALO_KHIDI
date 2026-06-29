/**
 * healwith: Patient Chat Thread Messages API
 *
 * GET /api/patient/chat/[threadId] — 특정 스레드의 메시지 이력 조회
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

async function getAuthUser(request: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;

  // 스레드 소유권 확인
  const { data: thread, error: tErr } = await (supabaseAdmin as any)
      .from("chat_threads")
    .select("id, user_id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .single();

  if (tErr || !thread) {
    return Response.json({ ok: false, error: "Thread not found" }, { status: 404 });
  }

  // 메시지 이력 조회
  // ⚠️ chat_messages 실제 컬럼은 actor_type/message_text (role/content 아님). is_internal 은
  // null 일 수 있어 false 동등비교 대신 "내부전용(true)만 제외"로 공개챗 메시지까지 포함.
  const { data: messages, error: mErr } = await (supabaseAdmin as any)
      .from("chat_messages")
    .select("id, actor_type, message_text, created_at, metadata")
    .eq("thread_id", threadId)
    .not("is_internal", "is", true)
    .order("created_at", { ascending: true })
    .limit(100);

  if (mErr) {
    console.error("[patient/chat/threadId] messages:", mErr.message);
    return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    messages: (messages || []).map((m: any) => ({
      id: m.id,
      role: m.actor_type === "patient" ? "user" : "assistant",
      content: m.message_text,
      created_at: m.created_at,
      sources: m.metadata?.sources || [],
    })),
  });
}
