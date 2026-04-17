/**
 * HEALO: Public Chat Message API
 *
 * POST /api/public/chat/message
 * - 비회원 사용 가능 (public_token 검증)
 * - patient 메시지 저장 → AI 응답 생성 → system 메시지 저장
 * - 3턴마다 normalized_inquiries draft 생성
 * - hand_off 감지 시 메타데이터 플래그
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "../../../../../src/lib/rateLimit";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
} from "../../../../../src/lib/chat/generateReply";
import {
  createEmptyIntake,
  computeMissingFields,
  computeExtractionConfidence,
} from "../../../../../src/lib/intakeSchema";
import {
  bodyPartFromText,
  contraindicationsAndFlagsFromMessage,
  extractTimelineFromQuery,
  extractBudgetFromQuery,
  extractDurationFromQuery,
  extractSeverityFromQuery,
} from "../../../../../src/lib/intakeExtract";
import { encryptStringNullable } from "../../../../../src/lib/security/encryptionV2";

const INTAKE_EVERY_N_TURNS = 3;

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { thread_id, public_token, message_text } = body;

    if (!thread_id || !public_token || !message_text?.trim()) {
      return Response.json(
        { ok: false, error: "thread_id, public_token, and message_text are required" },
        { status: 400 }
      );
    }

    const { data: thread, error: tErr } = await supabaseAdmin
      .from("chat_threads")
      .select("*")
      .eq("id", thread_id)
      .eq("public_token", public_token)
      .single();

    if (tErr || !thread) {
      return Response.json({ ok: false, error: "Invalid thread or token" }, { status: 403 });
    }

    if (thread.status === "resolved" || thread.status === "closed") {
      return Response.json({ ok: false, error: "Thread is closed" }, { status: 410 });
    }

    const trimmedMsg = message_text.trim();

    const { error: patientErr } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        thread_id,
        actor_type: "patient",
        message_text: trimmedMsg,
        metadata: { ip: clientIp },
      });
    if (patientErr) {
      console.error("[public/chat/message] patient insert:", patientErr.message);
      return Response.json({ ok: false, error: "Failed to save message" }, { status: 500 });
    }

    const handOff = detectHandOff(trimmedMsg);

    if (handOff.requested) {
      await supabaseAdmin
        .from("chat_threads")
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...thread.metadata,
            hand_off_requested: true,
            hand_off_reason: handOff.reason,
            hand_off_at: new Date().toISOString(),
          },
        })
        .eq("id", thread_id);
    }

    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("actor_type, message_text")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const chatMessages = (history || []).map((m: any) => ({
      role: m.actor_type === "patient" ? "user" as const : "assistant" as const,
      content: m.message_text,
    }));

    const lang = thread.metadata?.language || "en";

    const { reply, ragChunks, error: aiError, _analytics } = await generateChatReply(
      chatMessages,
      trimmedMsg,
      lang,
      thread_id
    );

    let finalReply = reply;
    if (handOff.requested) {
      finalReply += "\n\n🔔 I've flagged your request to be connected with a human coordinator. A team member will reach out to you shortly.";
    }

    const { data: aiMsg, error: aiInsertErr } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        thread_id,
        actor_type: "system",
        message_text: finalReply,
        metadata: {
          model: getModelName(),
          rag_chunks_used: ragChunks.length,
          hand_off: handOff.requested ? handOff.reason : null,
          ...(aiError ? { ai_error: aiError } : {}),
        },
      })
      .select("id")
      .single();
    if (aiInsertErr) {
      console.error("[public/chat/message] system insert:", aiInsertErr.message);
    }

    if (_analytics) {
      await logPlaybookUsage({
        threadId: thread_id,
        messageId: aiMsg?.id || null,
        language: lang,
        queryText: trimmedMsg,
        model: getModelName(),
        analytics: _analytics,
        handoffRequested: handOff.requested,
      });
    }

    await supabaseAdmin
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread_id);

    const patientMsgCount = (history || []).filter(
      (m: any) => m.actor_type === "patient"
    ).length;

    if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
      try {
        await createDraftIntake(thread, history || [], lang);
      } catch (e: any) {
        console.error("[public/chat/message] intake error:", e.message);
      }
    }

    if (aiError) {
      console.error(`[public/chat/message] AI reply failed: ${aiError}`);
    }

    return Response.json({
      ok: true,
      reply: finalReply,
      thread_id,
      hand_off: handOff.requested ? handOff : undefined,
      ...(aiError ? { ai_error: aiError } : {}),
    });
  } catch (err: any) {
    console.error(`[POST /api/public/chat/message] Unexpected: ${err.message}`, err.stack?.slice(0, 500));
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

async function createDraftIntake(
  thread: any,
  messages: Array<{ actor_type: string; message_text: string }>,
  lang: string
) {
  const patientTexts = messages
    .filter((m) => m.actor_type === "patient")
    .map((m) => m.message_text)
    .join(" ");

  const { intake } = createEmptyIntake("ai_agent");
  intake.chief_complaint = patientTexts.slice(0, 500) || null;
  intake.body_part = bodyPartFromText(patientTexts) ?? null;
  intake.timeline = extractTimelineFromQuery(patientTexts) ?? null;
  intake.budget = extractBudgetFromQuery(patientTexts) ?? null;
  intake.duration = extractDurationFromQuery(patientTexts) ?? null;
  intake.severity = extractSeverityFromQuery(patientTexts) ?? null;
  const { contraindications, allergy, medications } = contraindicationsAndFlagsFromMessage(patientTexts);
  intake.contraindications = contraindications.length ? contraindications : null;
  intake.allergy_flag = allergy || null;
  intake.medications_flag = medications || null;

  const missing = computeMissingFields(intake);
  const confidence = computeExtractionConfidence(intake, missing);

  const rawEnc = encryptStringNullable(patientTexts.slice(0, 1000));

  const { data, error } = await supabaseAdmin
    .from("normalized_inquiries")
    .insert({
      source_type: "ai_agent",
      language: lang,
      raw_message: rawEnc,
      constraints: {
        intake,
        meta: {
          pipeline_version: "v1_chat_thread",
          source_type: "ai_agent",
          model: getModelName(),
          thread_id: thread.id,
        },
      },
      extraction_confidence: confidence,
      missing_fields: missing.length ? missing : null,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (data?.id) {
    await supabaseAdmin
      .from("chat_threads")
      .update({ normalized_inquiry_id: data.id })
      .eq("id", thread.id);
  }
}
