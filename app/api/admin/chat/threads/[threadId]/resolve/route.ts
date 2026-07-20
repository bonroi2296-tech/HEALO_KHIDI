/**
 * healwith: Resolve Chat Thread → Playbook Draft 자동 생성
 *
 * POST /api/admin/chat/threads/:threadId/resolve
 *
 * 1. thread.status → 'resolved'
 * 2. 메시지들 합쳐서 transcript 생성
 * 3. sanitize → playbook_responses(draft) 자동 생성
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { sanitizeResponse, computeQualityScore } from "@/lib/playbook/sanitize";
import { runPostResolve } from "@/lib/automation/postResolveWorker";

function buildTranscript(
  messages: { actor_type: string; message_text: string; created_at: string; is_internal: boolean }[]
): string {
  return messages
    .filter((m) => !m.is_internal)
    .map((m) => {
      const ts = new Date(m.created_at).toISOString().slice(0, 16).replace("T", " ");
      const role =
        m.actor_type === "patient" ? "Patient" :
        m.actor_type === "admin" ? "Coordinator" : "System";
      return `[${ts}] ${role}: ${m.message_text}`;
    })
    .join("\n\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { threadId } = await params;

  try {
    const { data: thread, error: tErr } = await (supabaseAdmin as any)
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (tErr || !thread) {
      return Response.json({ ok: false, error: "Thread not found" }, { status: 404 });
    }

    if (thread.status === "resolved") {
      return Response.json({ ok: false, error: "Thread already resolved" }, { status: 409 });
    }

    const { data: messages, error: mErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;

    if (!messages || messages.length === 0) {
      return Response.json({ ok: false, error: "No messages in thread" }, { status: 400 });
    }

    const transcript = buildTranscript(messages as any);
    const { sanitized, flags } = sanitizeResponse(transcript);
    const qualityScore = computeQualityScore(flags);

    let language = "en";
    if (thread.normalized_inquiry_id) {
      const { data: ni } = await (supabaseAdmin as any)
      .from("normalized_inquiries")
        .select("language")
        .eq("id", thread.normalized_inquiry_id)
        .single();
      if (ni?.language) language = ni.language;
    }

    const { data: draft, error: draftErr } = await (supabaseAdmin as any)
      .from("playbook_responses")
      .insert({
        normalized_inquiry_id: thread.normalized_inquiry_id || null,
        language,
        case_tags: [],
        response_text_raw: transcript,
        response_text_sanitized: sanitized,
        quality_score: qualityScore,
        status: "draft",
        metadata: {
          thread_id: threadId,
          inquiry_id: thread.inquiry_id,
          normalized_inquiry_id: thread.normalized_inquiry_id,
          sanitize_flags: flags,
          message_count: messages.length,
        },
      })
      .select("id")
      .single();

    if (draftErr) throw draftErr;

    const now = new Date().toISOString();
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ status: "resolved", updated_at: now })
      .eq("id", threadId);

    // 자동 패턴 추출 파이프라인 — resolve 응답에 영향 없이 백그라운드로 실행.
    // after(): 응답 후에도 함수를 살려 LLM 추출이 잘리지 않게(서버리스 freeze, 독립리뷰 #738 지적).
    after(() =>
      runPostResolve(threadId).catch((err) => {
        console.error("[resolve] postResolve background error:", err.message);
      })
    );

    return Response.json({
      ok: true,
      thread_id: threadId,
      coordinator_response_id: draft.id,
      message_count: messages.length,
      quality_score: qualityScore,
      sanitize_flags: flags,
    });
  } catch (err: any) {
    console.error("[POST resolve]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
