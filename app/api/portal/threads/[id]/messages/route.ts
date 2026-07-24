/**
 * healwith: 스레드 메시지 조회/전송
 *
 * GET  /api/portal/threads/:id/messages — 환자(본인 스레드, is_internal 제외) / staff(전체)
 * POST /api/portal/threads/:id/messages — Body: { text }
 *   - staff 전송 → actor_type=coordinator, 스레드 status=waiting_patient
 *   - 환자 전송 → actor_type=user, 스레드 status=waiting_coordinator
 *
 * chat_messages 는 RLS상 service_role 전용 → 서버 경유 필수.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth, type PortalAuthResult } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// 본인 스레드 또는 staff 인지 확인 (IDOR 차단)
async function canAccessThread(
  auth: Extract<PortalAuthResult, { success: true }>,
  threadId: string
): Promise<boolean> {
  if (auth.isStaff) return true;
  const { data } = await supabaseAdmin
    .from("chat_threads")
    .select("id, user_id")
    .eq("id", threadId)
    .maybeSingle();
  return !!data && data.user_id === auth.userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  const { id: threadId } = await params;

  try {
    if (!(await canAccessThread(auth, threadId))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    let q = supabaseAdmin
      .from("chat_messages")
      .select("id, thread_id, actor_type, actor_id, message_text, is_internal, attachments, metadata, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (!auth.isStaff) q = q.eq("is_internal", false);

    const { data, error } = await q;
    if (error) {
      console.error("[portal/messages GET] error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, messages: data || [] });
  } catch (err: any) {
    console.error("[portal/messages GET] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  const { id: threadId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4000) : "";
  if (!text) {
    return Response.json({ ok: false, error: "text_required" }, { status: 400 });
  }

  try {
    if (!(await canAccessThread(auth, threadId))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const actorType = auth.isStaff ? "coordinator" : "user";

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        actor_type: actorType,
        actor_id: auth.userId,
        message_text: text,
        is_internal: false,
      } as any)
      .select("id, thread_id, actor_type, actor_id, message_text, is_internal, created_at")
      .single();

    if (error || !data) {
      console.error("[portal/messages POST] insert error:", error?.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // 스레드 상태 갱신 (응답 대기 방향 전환)
    await supabaseAdmin
      .from("chat_threads")
      .update({
        status: auth.isStaff ? "waiting_patient" : "waiting_coordinator",
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      } as any)
      .eq("id", threadId);

    // 메신저 스레드(텔레그램·왓츠앱)면 스태프 답장을 환자의 메신저로 실제 발신.
    // 원래 관리자 채팅 API에만 있어서 코디 포털 답장이 DB에만 남고 환자에겐 안 갔다
    // (2026-07-24 PO 실기기 발견) — 공용 모듈로 뽑아 여기도 동일 적용.
    let delivery: string | undefined;
    if (auth.isStaff) {
      const { data: thread } = await supabaseAdmin
        .from("chat_threads")
        .select("channel, metadata")
        .eq("id", threadId)
        .maybeSingle();
      if (thread) {
        const { relayStaffReplyToMessenger } = await import("@/lib/messaging/staffReplyRelay");
        delivery = await relayStaffReplyToMessenger({
          threadId,
          messageId: data.id,
          messageText: text,
          thread: thread as any,
        });
      }
    }

    return Response.json({ ok: true, message: data, ...(delivery ? { delivery } : {}) });
  } catch (err: any) {
    console.error("[portal/messages POST] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
