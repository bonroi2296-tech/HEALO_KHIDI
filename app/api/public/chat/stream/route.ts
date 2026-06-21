/**
 * healwith: Public Chat Message API (스트리밍)
 *
 * POST /api/public/chat/stream
 * - /api/public/chat/message 와 동일한 흐름이지만 AI 응답을 토큰 단위로 스트리밍.
 * - 와이어 형식: [AI 평문 토큰들...] + 마지막에 구분자 STREAM_META_DELIM + JSON 메타({hand_off, ai_error}).
 *   프론트는 구분자 전까지를 말풍선 텍스트로, 이후 JSON 을 상태 업데이트로 처리한다.
 * - 사전 검증 실패(회수제한·토큰오류·닫힌 스레드)는 스트림 전에 JSON 오류로 반환(비200).
 * - 생성 중 오류/빈응답은 streamChatReply 가 안내문으로 자체 처리(HTTP 200 유지, ai_error 로 표기).
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import {
  streamChatReply,
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

// 메타 프레임 구분자(RS, U+001E) — 일반 대화 텍스트에 거의 나오지 않음.
const STREAM_META_DELIM = "";

function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  // 분당 회수제한 + aiGuard(일일·전역)를 병렬 검사. 오류 우선순위는 분당 → aiGuard.
  const [rl, aiGuard] = await Promise.all([
    checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT),
    checkAiGuards(clientIp, "/api/public/chat/stream"),
  ]);
  if (!rl.allowed) return jsonError("rate_limited", 429);
  if (!aiGuard.allowed) return jsonError(aiGuard.code, aiGuard.status);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_body", 400);
  }

  const { thread_id, public_token, message_text } = body;
  const attachments = sanitizeAttachments(body?.attachments);
  const hasAttachments = attachments.length > 0;

  if (!thread_id || !public_token || (!message_text?.trim() && !hasAttachments)) {
    return jsonError("thread_id, public_token, and message_text or attachments are required", 400);
  }

  const { data: thread, error: tErr } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("*")
    .eq("id", thread_id)
    .eq("public_token", public_token)
    .single();

  if (tErr || !thread) return jsonError("Invalid thread or token", 403);
  if (thread.status === "resolved" || thread.status === "closed") {
    return jsonError("Thread is closed", 410);
  }

  const trimmedMsg = (message_text || "").trim();
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
    console.error("[public/chat/stream] patient insert:", patientErr.message);
    return jsonError("Failed to save message", 500);
  }

  const handOff = detectHandOff(trimmedMsg);
  const escalate = handOff.requested || hasAttachments;
  const escalateReason = handOff.reason || (hasAttachments ? "attachment_uploaded" : null);

  const threadMeta: any =
    thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
      ? thread.metadata
      : {};
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

  // 모델에는 최근 10개만 전달(토큰↓·빈응답 완화). 문의서 초안은 전체 history 사용.
  const chatMessages = (history || [])
    .map((m: any) => ({
      role: m.actor_type === "patient" ? ("user" as const) : ("assistant" as const),
      content: m.message_text,
    }))
    .slice(-10);

  const lang = threadMeta.language || "en";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (text: string) => {
        if (text) controller.enqueue(encoder.encode(text));
      };

      let aiReply = "";
      let ragChunksLen = 0;
      let aiError: string | undefined;
      let analytics: any = undefined;

      try {
        // 1) AI 응답 — 텍스트 없이 자료만 올린 경우는 모델을 부르지 않음(판독 안 함).
        if (trimmedMsg) {
          const r = await streamChatReply(chatMessages, trimmedMsg, lang, thread_id, (chunk) =>
            enqueue(chunk)
          );
          aiReply = r.reply;
          ragChunksLen = r.ragChunks.length;
          aiError = r.error;
          analytics = r._analytics;
        }

        // 2) 자료 접수 확인(판독 아님) — 첨부가 있으면 항상 덧붙여 스트림.
        let finalReply = aiReply;
        if (hasAttachments) {
          const ack = ATTACHMENT_ACK[lang] || ATTACHMENT_ACK.en;
          const piece = finalReply ? `\n\n${ack}` : ack;
          enqueue(piece);
          finalReply = finalReply ? `${finalReply}${piece}` : ack;
        }

        // 3) 핸드오프 확인 멘트.
        if (handOff.requested) {
          const piece = "\n\n" + (HANDOFF_CONFIRM[lang] || HANDOFF_CONFIRM.en);
          enqueue(piece);
          finalReply += piece;
        }

        // 4) system 메시지 저장 + playbook 로그(스트림 닫기 전에 완료).
        const { data: aiMsg, error: aiInsertErr } = await (supabaseAdmin as any)
          .from("chat_messages")
          .insert({
            thread_id,
            actor_type: "system",
            message_text: finalReply,
            metadata: {
              model: getModelName(),
              rag_chunks_used: ragChunksLen,
              hand_off: escalate ? escalateReason : null,
              streamed: true,
              ...(hasAttachments ? { attachment_ack: true } : {}),
              ...(aiError ? { ai_error: aiError } : {}),
            },
          })
          .select("id")
          .single();
        if (aiInsertErr) {
          console.error("[public/chat/stream] system insert:", aiInsertErr.message);
        }

        if (analytics) {
          await logPlaybookUsage({
            threadId: thread_id,
            messageId: aiMsg?.id || null,
            language: lang,
            queryText: trimmedMsg,
            model: getModelName(),
            analytics,
            handoffRequested: handOff.requested,
          }).catch(() => {});
        }

        await (supabaseAdmin as any)
          .from("chat_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", thread_id);

        // 5) 문의서 초안 — 응답 후 백그라운드.
        const patientMsgCount = (history || []).filter(
          (m: any) => m.actor_type === "patient"
        ).length;
        if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
          after(async () => {
            try {
              await createDraftIntake(thread, (history || []) as any, lang);
            } catch (e: any) {
              console.error("[public/chat/stream] intake error:", e.message);
            }
          });
        }

        // 6) 메타 프레임.
        const meta = {
          ok: true,
          hand_off: escalate ? { requested: true, reason: escalateReason } : undefined,
          ...(aiError ? { ai_error: aiError } : {}),
        };
        enqueue(STREAM_META_DELIM + JSON.stringify(meta));
        controller.close();
      } catch (err: any) {
        console.error("[public/chat/stream] stream error:", err?.message);
        // 이미 일부 텍스트를 보냈을 수 있음 → 메타로 오류만 알리고 닫음.
        try {
          enqueue(STREAM_META_DELIM + JSON.stringify({ ok: true, ai_error: "internal_error" }));
        } catch {
          /* controller 이미 닫힘 */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
