/**
 * healwith: Chat Thread Messages API
 *
 * POST /api/admin/chat/threads/:threadId/messages — 메시지 추가 (admin)
 * GET  /api/admin/chat/threads/:threadId/messages — 메시지 목록 조회
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { threadId } = await params;

  try {
    const body = await request.json();
    const {
      actor_type = "admin",
      actor_id,
      message_text,
      attachments = [],
      is_internal = false,
      metadata = {},
    } = body;

    if (!message_text || typeof message_text !== "string" || !message_text.trim()) {
      return Response.json({ ok: false, error: "message_text is required" }, { status: 400 });
    }

    if (!["patient", "admin", "system"].includes(actor_type)) {
      return Response.json({ ok: false, error: "Invalid actor_type" }, { status: 400 });
    }

    const { data: thread } = await (supabaseAdmin as any)
      .from("chat_threads")
      .select("id, status, channel, metadata")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return Response.json({ ok: false, error: "Thread not found" }, { status: 404 });
    }

    const row: Record<string, any> = {
      thread_id: threadId,
      actor_type,
      message_text: message_text.trim(),
      attachments,
      is_internal,
      metadata,
    };
    if (actor_id) row.actor_id = actor_id;
    if (actor_type === "admin" && auth.authResult.userId) {
      row.actor_id = auth.authResult.userId;
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[POST messages]", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    // 텔레그램 스레드면 코디 답장을 환자의 텔레그램으로 실제 발신(내부 메모는 제외).
    // 실패해도 저장은 유지하되 delivery='failed' 를 남겨 코디가 미전달을 알 수 있게 한다.
    let delivery: string | undefined;
    if (thread.channel === "telegram" && !is_internal && actor_type === "admin") {
      const tgChatId = thread.metadata?.telegram?.chat_id;
      if (tgChatId) {
        const { sendTelegramPatientMessage } = await import("@/lib/messaging/telegram");
        const sent = await sendTelegramPatientMessage(tgChatId, message_text.trim());
        delivery = sent ? "sent" : "failed";
        if (!sent) {
          await (supabaseAdmin as any)
            .from("chat_messages")
            .update({ metadata: { ...(data?.metadata || {}), delivery: "failed" } })
            .eq("id", data.id);
        }
      } else {
        delivery = "failed";
      }
    }

    return Response.json({ ok: true, message: data, ...(delivery ? { delivery } : {}) });
  } catch (err: any) {
    console.error("[POST messages] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — 진료의뢰 패킷(1차 소견 메시지)의 의사 검수 상태 갱신.
// body: { messageId, reviewed?, note? } → 해당 메시지 metadata.triage 를 검수완료로 표시.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { threadId } = await params;

  try {
    const body = await request.json();
    const { messageId, reviewed, note } = body || {};
    if (!messageId) {
      return Response.json({ ok: false, error: "messageId is required" }, { status: 400 });
    }

    const { data: msg } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("metadata")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .single();
    if (!msg) {
      return Response.json({ ok: false, error: "message_not_found" }, { status: 404 });
    }

    const meta =
      msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata) ? msg.metadata : {};
    const triage = meta.triage && typeof meta.triage === "object" ? meta.triage : {};
    const newMeta = {
      ...meta,
      triage: {
        ...triage,
        needs_doctor_review: false,
        reviewed: reviewed !== false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.authResult.userId || null,
        ...(note ? { review_note: String(note).slice(0, 2000) } : {}),
      },
    };

    const { error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .update({ metadata: newMeta })
      .eq("id", messageId);
    if (error) {
      console.error("[PATCH messages]", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[PATCH messages] Unexpected:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  assertSupabaseEnv();
  // 읽기(메시지 조회)는 코디네이터도 허용(staff). 작성(POST)·검수(PATCH)는 admin 유지.
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const { threadId } = await params;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET messages]", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, messages: data });
  } catch (err: any) {
    console.error("[GET messages] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
