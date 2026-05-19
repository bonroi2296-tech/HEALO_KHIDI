/**
 * /api/chat/thread-summary — AI 채팅 thread 기본 정보 조회 (폼 자동채움용)
 * guest_name, guest_email, guest_country 반환. PII 민감하지 않은 필드만.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");

  if (!threadId || !/^[0-9a-f-]{36}$/i.test(threadId)) {
    return Response.json({ ok: false, error: "invalid_thread_id" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("chat_threads")
      .select("guest_name, guest_email, guest_country")
      .eq("id", threadId)
      .maybeSingle();

    if (error || !data) {
      return Response.json({ ok: false, error: "thread_not_found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      guest_name: data.guest_name ?? null,
      guest_email: data.guest_email ?? null,
      guest_country: data.guest_country ?? null,
    });
  } catch (e: any) {
    console.error("[/api/chat/thread-summary]", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
