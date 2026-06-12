/**
 * HEALO: Chat Thread Messages API
 *
 * POST /api/admin/chat/threads/:threadId/messages — 메시지 추가 (admin)
 * GET  /api/admin/chat/threads/:threadId/messages — 메시지 목록 조회
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

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
      .select("id, status")
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

    return Response.json({ ok: true, message: data });
  } catch (err: any) {
    console.error("[POST messages] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
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
