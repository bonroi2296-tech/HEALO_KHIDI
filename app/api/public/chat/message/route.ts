/**
 * healwith: Public Chat Message API
 *
 * POST /api/public/chat/message
 * - 비회원 사용 가능 (public_token 검증)
 * - patient 메시지 저장 → AI 응답 생성 → system 메시지 저장
 * - 3턴마다 normalized_inquiries draft 생성
 * - hand_off 감지 시 메타데이터 플래그
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
} from "@/lib/chat/generateReply";
import {
  INTAKE_EVERY_N_TURNS,
  ATTACHMENT_ACK,
  HANDOFF_CONFIRM,
  sanitizeAttachments,
  createDraftIntake,
} from "@/lib/chat/publicChatHelpers";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  // DB 기반 회수제한 + AI 비용 가드 (IP 일일 상한 · 전역 총량 차단기).
  // 분당 회수제한과 aiGuard(일일·전역)는 서로 독립이라 DB 왕복을 병렬로(지연 단축).
  // 오류 우선순위는 분당 → aiGuard 순으로 평가하여 기존 동작 유지.
  const [rl, aiGuard] = await Promise.all([
    checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT),
    checkAiGuards(clientIp, "/api/public/chat/message"),
  ]);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (!aiGuard.allowed) {
    return Response.json({ ok: false, error: aiGuard.code }, { status: aiGuard.status });
  }

  try {
    const body = await request.json();
    const { thread_id, public_token, message_text } = body;
    const attachments = sanitizeAttachments(body?.attachments);
    const hasAttachments = attachments.length > 0;

    // 텍스트 또는 첨부 중 하나는 있어야 함(자료만 올리는 케이스 허용).
    if (!thread_id || !public_token || (!message_text?.trim() && !hasAttachments)) {
      return Response.json(
        { ok: false, error: "thread_id, public_token, and message_text or attachments are required" },
        { status: 400 }
      );
    }

    const { data: thread, error: tErr } = await (supabaseAdmin as any)
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

    const trimmedMsg = (message_text || "").trim();
    // 자료만 올린 경우 빈 말풍선 대신 표시·이력용 마커 텍스트.
    const patientMsgText = trimmedMsg || `📎 ${attachments.length}`;

    const { error: patientErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id,
        actor_type: "patient",
        message_text: patientMsgText,
        attachments,
        metadata: { ip: clientIp, ...(hasAttachments ? { has_attachments: true } : {}) },
      });
    if (patientErr) {
      console.error("[public/chat/message] patient insert:", patientErr.message);
      return Response.json({ ok: false, error: "Failed to save message" }, { status: 500 });
    }

    const handOff = detectHandOff(trimmedMsg);
    // 자료 업로드 = 사람(의료진) 검토 필요 → 자동 에스컬레이션(코디 알림).
    const escalate = handOff.requested || hasAttachments;
    const escalateReason = handOff.reason || (hasAttachments ? "attachment_uploaded" : null);

    const threadMeta: any = (thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)) ? thread.metadata : {};
    if (escalate) {
      await (supabaseAdmin as any)
      .from("chat_threads")
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...threadMeta,
            hand_off_requested: true,
            hand_off_reason: escalateReason,
            hand_off_at: new Date().toISOString(),
            ...(hasAttachments ? { has_attachments: true } : {}),
          },
        })
        .eq("id", thread_id);
    }

    const { data: history } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("actor_type, message_text")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // 모델에는 최근 10개만 전달: 입력 토큰을 줄여 첫 응답을 앞당기고(지연↓),
    // 긴 기록 누적 시 빈응답이 늘던 현상도 완화. 문의서 초안은 아래에서 전체 history 사용.
    const chatMessages = (history || [])
      .map((m: any) => ({
        role: m.actor_type === "patient" ? ("user" as const) : ("assistant" as const),
        content: m.message_text,
      }))
      .slice(-10);

    const lang = threadMeta.language || "en";

    // 자료만 올린 경우(질문 텍스트 없음)는 AI를 호출하지 않음 — AI는 자료 판독을 하지 않으므로
    // 빈 질의로 모델을 돌릴 이유가 없음. 접수 확인(ACK)만 즉시 응답.
    let reply = "";
    let ragChunks: any[] = [];
    let aiError: string | undefined;
    let _analytics: any = undefined;
    if (trimmedMsg) {
      const r = await generateChatReply(chatMessages, trimmedMsg, lang, thread_id);
      reply = r.reply;
      ragChunks = r.ragChunks;
      aiError = r.error;
      _analytics = r._analytics;
    }

    let finalReply = reply;
    // 자료 접수 확인(판독 아님) — 첨부가 있으면 항상 덧붙임.
    if (hasAttachments) {
      const ack = ATTACHMENT_ACK[lang] || ATTACHMENT_ACK.en;
      finalReply = finalReply ? `${finalReply}\n\n${ack}` : ack;
    }
    if (handOff.requested) {
      finalReply += "\n\n" + (HANDOFF_CONFIRM[lang] || HANDOFF_CONFIRM.en);
    }

    const { data: aiMsg, error: aiInsertErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id,
        actor_type: "system",
        message_text: finalReply,
        metadata: {
          model: getModelName(),
          rag_chunks_used: ragChunks.length,
          hand_off: escalate ? escalateReason : null,
          ...(hasAttachments ? { attachment_ack: true } : {}),
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

    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread_id);

    const patientMsgCount = (history || []).filter(
      (m: any) => m.actor_type === "patient"
    ).length;

    // 문의서 초안 생성은 응답을 막을 필요가 없음 → 응답 전송 후 백그라운드로(해당 턴 지연 제거).
    if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
      after(async () => {
        try {
          await createDraftIntake(thread, (history || []) as any, lang);
        } catch (e: any) {
          console.error("[public/chat/message] intake error:", e.message);
        }
      });
    }

    if (aiError) {
      console.error(`[public/chat/message] AI reply failed: ${aiError}`);
    }

    return Response.json({
      ok: true,
      reply: finalReply,
      thread_id,
      hand_off: escalate ? { requested: true, reason: escalateReason } : undefined,
      ...(aiError ? { ai_error: aiError } : {}),
    });
  } catch (err: any) {
    console.error(`[POST /api/public/chat/message] Unexpected: ${err.message}`, err.stack?.slice(0, 500));
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
