/**
 * HEALO: 응급 SOS 알림 — 응급 스레드 찾기/생성 + 긴급 메시지 + waiting_coordinator
 *
 * POST /api/portal/emergency  Body: { lang? }
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const EMERGENCY_SUBJECT = "🚨 Emergency alert";

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* body 없이도 허용 */
  }
  const lang = body?.lang === "ko" ? "ko" : "en";

  try {
    // 기존 응급 스레드 재사용 (중복 생성 방지)
    const { data: existing } = await supabaseAdmin
      .from("chat_threads")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("subject", EMERGENCY_SUBJECT)
      .limit(1)
      .maybeSingle();

    let threadId = existing?.id;
    if (!threadId) {
      const { data: newThread, error: threadErr } = await supabaseAdmin
        .from("chat_threads")
        .insert({
          user_id: auth.userId,
          subject: EMERGENCY_SUBJECT,
          status: "waiting_coordinator",
          metadata: { priority: "emergency", source: "sos_button" },
        } as any)
        .select("id")
        .single();
      if (threadErr || !newThread) {
        console.error("[portal/emergency] thread insert error:", threadErr?.message);
        return Response.json({ ok: false, error: "thread_failed" }, { status: 500 });
      }
      threadId = newThread.id;
    }

    const { error: msgErr } = await supabaseAdmin.from("chat_messages").insert({
      thread_id: threadId,
      actor_type: "user",
      actor_id: auth.userId,
      message_text:
        lang === "ko"
          ? "🚨 긴급 도움이 필요합니다. 가능한 빨리 연락 부탁드립니다."
          : "🚨 I need urgent help. Please contact me as soon as possible.",
      is_internal: false,
      metadata: { priority: "emergency" },
    } as any);

    if (msgErr) {
      console.error("[portal/emergency] message insert error:", msgErr.message);
      return Response.json({ ok: false, error: "message_failed" }, { status: 500 });
    }

    await supabaseAdmin
      .from("chat_threads")
      .update({
        status: "waiting_coordinator",
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      } as any)
      .eq("id", threadId);

    return Response.json({ ok: true, threadId });
  } catch (err: any) {
    console.error("[portal/emergency] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
