/**
 * HEALO: Extract Playbook Pattern from Chat Thread
 *
 * POST /api/admin/playbook/patterns/from-thread
 * - thread의 메시지에서 응대 논리 구조(패턴) 추출 → draft 저장
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../src/lib/auth/requireAdminAuth";
import { extractPattern } from "../../../../../../src/lib/playbook/extractPattern";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { thread_id } = await request.json();
    if (!thread_id) {
      return Response.json({ ok: false, error: "thread_id required" }, { status: 400 });
    }

    const { data: thread, error: tErr } = await supabaseAdmin
      .from("chat_threads")
      .select("*, normalized_inquiries(language, treatment_slug, country)")
      .eq("id", thread_id)
      .single();

    if (tErr || !thread) {
      return Response.json({ ok: false, error: "Thread not found" }, { status: 404 });
    }

    const { data: messages, error: mErr } = await supabaseAdmin
      .from("chat_messages")
      .select("id, actor_type, message_text, created_at, is_internal")
      .eq("thread_id", thread_id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;
    if (!messages || messages.length === 0) {
      return Response.json({ ok: false, error: "No messages in thread" }, { status: 400 });
    }

    const ni = thread.normalized_inquiries;
    const context = {
      language: ni?.language || thread.metadata?.language || "en",
      country: ni?.country || thread.metadata?.country || null,
      treatment_slug: ni?.treatment_slug || thread.metadata?.treatment_slug || null,
    };

    const pattern = await extractPattern(messages, context);

    const { data: saved, error: insertErr } = await supabaseAdmin
      .from("playbook_patterns")
      .insert({
        source_thread_id: thread_id,
        source_message_ids: pattern.source_message_ids,
        language: context.language,
        scope: pattern.scope,
        treatment_slug: pattern.treatment_slug,
        country: pattern.country,
        trigger: pattern.trigger,
        user_intent: pattern.user_intent,
        key_questions: pattern.key_questions,
        response_structure: pattern.response_structure,
        response_template: pattern.response_template,
        safety_notes: pattern.safety_notes,
        quality_score: pattern.quality_score,
        status: "draft",
        metadata: {
          extracted_by: auth.authResult.email,
          message_count: messages.length,
        },
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    return Response.json({ ok: true, pattern: saved });
  } catch (err: any) {
    console.error("[POST from-thread]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
