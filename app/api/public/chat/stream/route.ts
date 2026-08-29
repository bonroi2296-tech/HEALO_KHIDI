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
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import {
  streamChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
  modelBypassKind,
} from "@/lib/chat/generateReply";
import { generateTriage } from "@/lib/chat/triage";
import { scanRedlines, redlineCorrectionNotice } from "@/lib/chat/safetyGuard";
import {
  INTAKE_EVERY_N_TURNS,
  ATTACHMENT_ACK,
  sanitizeAttachments,
  createDraftIntake,
  hasReachableContact,
  pickHandoffConfirm,
} from "@/lib/chat/publicChatHelpers";

// 공개 라우트지만 same-origin fetch 라 Supabase 인증 쿠키가 함께 옴 → 로그인 사용자면 식별 가능.
// 실패(비로그인·토큰 만료)는 조용히 null (이 라우트는 비로그인도 허용).
async function getOptionalUser(request: NextRequest) {
  // 인증 쿠키가 아예 없으면 익명 확정 → Supabase auth 네트워크 왕복 생략(매 턴 지연 방지).
  if (!request.cookies.getAll().some((c) => /auth-token/.test(c.name))) return null;
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

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

  // 인코딩 깨진 본문(U+FFFD) 거부 — 깨진 한글이 chat_threads→inquiries 승격까지 그대로 박힘 (POSTMORTEMS #92)
  if (hasMojibake(body)) {
    return jsonError("broken_encoding", 400);
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
  // PIPA: 민감 건강정보 처리 전 동의 필수. 동의 기록 없는 thread(게이트 도입 이전 시작분·
  // 재방문 쿠키 포함)는 메시지 처리 차단 → 클라이언트가 동의 게이트를 띄워 기록하게 함.
  if (thread.metadata?.consent?.health_crossborder !== true) {
    return jsonError("consent_required", 403);
  }

  // 로그인 연동: 익명으로 시작한 스레드라도 로그인 사용자가 쓰면 계정에 연결한다(아직 미연결일 때만
  // 인증 조회 — 매 턴 auth 왕복 방지). 연결되면 reachable=true → "접수완료" 정상 안내 + 세션 사실 정확.
  if (!thread.user_id) {
    const user = await getOptionalUser(request);
    if (user) {
      thread.user_id = user.id;
      await (supabaseAdmin as any)
        .from("chat_threads")
        .update({
          user_id: user.id,
          metadata: { ...((thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)) ? thread.metadata : {}), is_logged_in: true },
        })
        .eq("id", thread_id);
    }
  }
  const reachable = hasReachableContact(thread);

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

  // 멀티스레드 목록 가독성: 제목이 아직 기본값("New Chat")이고 실제 텍스트가 있으면 첫 메시지로 채운다.
  // subject 는 평문 저장이므로 발췌 전 PII(이메일·전화 등) 마스킹 — message_text 마스킹은
  // '모델 전송 사본'에만 적용되지 저장본엔 적용되지 않으므로 여기서 별도 처리(2026-07-02 전수 감사).
  const curSubject = (thread as any).subject;
  if (trimmedMsg && (!curSubject || curSubject === "New Chat")) {
    const { redactModelPii } = await import("@/lib/security/redactModelPii");
    const masked = redactModelPii(trimmedMsg);
    const snippet = masked.slice(0, 60) + (masked.length > 60 ? "…" : "");
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ subject: snippet })
      .eq("id", thread_id);
  }

  const handOff = detectHandOff(trimmedMsg);
  const escalate = handOff.requested || hasAttachments;
  const escalateReason = handOff.reason || (hasAttachments ? "attachment_uploaded" : null);
  let bellRung = false; // 이 요청에서 코디 종이 이미 울렸는지(레드라인 적발 시 중복 호출 방지)

  const threadMeta: any =
    thread.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
      ? thread.metadata
      : {};
  if (escalate) {
    // 스레드당 1회만 종을 울린다(자료 여러 번 업로드 시 도배 방지).
    const alreadyNotified = !!threadMeta.hand_off_notified;
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        metadata: {
          ...threadMeta,
          hand_off_requested: true,
          hand_off_reason: escalateReason,
          hand_off_at: new Date().toISOString(),
          hand_off_notified: true,
          ...(hasAttachments ? { has_attachments: true } : {}),
        },
      })
      .eq("id", thread_id);
    if (!alreadyNotified) {
      try {
        const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
        await notifyStaffChatHandoff({ threadId: thread_id, reason: escalateReason });
        bellRung = true;
      } catch (e: any) {
        console.warn("[chat/stream] handoff bell 실패(무시):", e?.message);
      }
    } else {
      bellRung = true;
    }
  }

  const { data: history } = await (supabaseAdmin as any)
    .from("chat_messages")
    .select("actor_type, message_text, metadata")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(30);

  // 모델 맥락: '비답변' 시스템 메시지(에러폴백·자료ACK·빈텍스트)를 제외하고 최근 N개만.
  // (#158과 동일 — 비답변이 쌓이면 모델이 인사·되묻기만 흉내내는 버그 방지. 저장은 보존.)
  const MODEL_HISTORY_LIMIT = 12;
  const chatMessages = (history || [])
    .filter((m: any) => {
      if (m.actor_type !== "system") return true;
      if (m?.metadata?.ai_error) return false;
      if (m?.metadata?.attachment_ack) return false;
      return !!String(m.message_text || "").trim();
    })
    .slice(-MODEL_HISTORY_LIMIT)
    .map((m: any) => ({
      role: m.actor_type === "patient" ? ("user" as const) : ("assistant" as const),
      content: m.message_text,
    }));

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
      let triagePacket: any = null;     // 의료진용 진료의뢰 패킷(첨부 판독 시)
      let usedAckFallback = false;      // 첨부를 못 읽어 기존 접수안내로 떨어졌는지

      try {
        // 1) 첨부가 있으면 → 멀티모달 1차 소견(triage). 없고 텍스트만 있으면 → 기존 RAG 응답.
        //    (PO 결정 2026-06-29: 자료 올리면 AI가 1차 소견 즉시 + 사후 의사 검수.)
        let finalReply = "";
        if (hasAttachments) {
          const triage = await generateTriage({ attachments, messageText: trimmedMsg, lang });
          if (triage.patientReply) {
            enqueue(triage.patientReply);
            finalReply = triage.patientReply;
            triagePacket = triage.packet;
          } else {
            // 모델이 못 읽음(doc 등)·오류 → 기존 "접수 안내(판독 아님)"로 폴백.
            const ack = ATTACHMENT_ACK[lang] || ATTACHMENT_ACK.en;
            enqueue(ack);
            finalReply = ack;
            usedAckFallback = true;
            if (triage.error) aiError = triage.error;
          }
        } else if (trimmedMsg) {
          const r = await streamChatReply(
            chatMessages,
            trimmedMsg,
            lang,
            thread_id,
            (chunk) => enqueue(chunk),
            {
              isLoggedIn: !!thread.user_id,
              hasReachableContact: reachable,
              // 이번 턴 첨부 or 과거 첨부 스레드 → "파일 못 읽음" 하드룰 (첨부 내용 환각 방지)
              hasAttachments: hasAttachments || !!threadMeta.has_attachments,
            }
          );
          aiReply = r.reply;
          finalReply = aiReply;
          ragChunksLen = r.ragChunks.length;
          aiError = r.error;
          analytics = r._analytics;
        }

        // 3) 핸드오프 확인 멘트 — 연락 가능하면 "접수완료", 아니면 연락처부터 요청(거짓 약속 방지).
        if (handOff.requested) {
          const piece = "\n\n" + pickHandoffConfirm(lang, reachable);
          enqueue(piece);
          finalReply += piece;
        }

        // 🚨 송출 후 레드라인 최종 점검 — 스트림은 원시 텍스트 append라 이미 흘러간 답변을
        //    취소할 수 없다. 따라서 critical(완치·약물·예후 단정) 적발 시:
        //    ① 환자 말풍선에 즉시 정정·코디연결 안내를 덧붙이고
        //    ② 비동기 judge 를 기다리지 않고 코디 종을 즉시 울린다(이미 울렸으면 생략)
        //    ③ 기록에 redline 플래그 + 의사 검수 대기로 남긴다.
        let redlineFlags: string[] | null = null;
        const redscan = scanRedlines(finalReply);
        if (redscan.critical) {
          redlineFlags = redscan.flags;
          console.warn(`[chat/stream] REDLINE detected: ${redscan.flags.join(",")} thread=${thread_id}`);
          const notice = "\n\n" + redlineCorrectionNotice(lang);
          enqueue(notice);
          finalReply += notice;
          if (!bellRung) {
            try {
              const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
              await notifyStaffChatHandoff({ threadId: thread_id, reason: "ai_redline" });
              bellRung = true;
            } catch (e: any) {
              console.warn("[chat/stream] redline bell 실패(무시):", e?.message);
            }
          }
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
              hand_off: escalate || redlineFlags ? (redlineFlags ? "ai_redline" : escalateReason) : null,
              streamed: true,
              // 첨부를 못 읽어 접수안내로 폴백한 경우만 비답변 처리(모델 히스토리 제외). 실제 1차 소견은 답변으로 보존.
              ...(hasAttachments && usedAckFallback ? { attachment_ack: true } : {}),
              // 진료의뢰 패킷 + 의사 검수 대기 플래그(Phase 2·3 에서 어드민이 읽어 검수).
              ...(triagePacket ? { triage: { packet: triagePacket, needs_doctor_review: true, reviewed: false } } : {}),
              // critical 레드라인 적발 — 어드민/코디 검수 큐에서 우선 확인.
              ...(redlineFlags ? { redline: redlineFlags, needs_doctor_review: true } : {}),
              ...(aiError ? { ai_error: aiError } : {}),
              // 모델을 «안 거치고» 코드가 가로챈 턴이면 그 이름을 남긴다(잡담·화제정정·마스터키).
              // 안 남기면 가로채기 오작동이 정상 답변과 구별이 안 된다 — 2026-08-28 사고가 그것이었다.
              ...(modelBypassKind(analytics?.ragScoring) ? { bypassed: modelBypassKind(analytics?.ragScoring) } : {}),
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
        // 에스컬레이션(사람 연결 요청·의료자료 첨부) 턴엔 3턴 규칙과 무관하게 즉시 승격 —
        // 둘 다 이 라우트가 hand_off_requested 를 세우는 사유(메신저 봇과 동일 게이트, intakeGate.ts).
        const patientMsgCount = (history || []).filter(
          (m: any) => m.actor_type === "patient"
        ).length;
        if (escalate || (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0)) {
          after(async () => {
            try {
              await createDraftIntake(thread, (history || []) as any, lang, clientIp, {
                handOffRequested: escalate,
              });
            } catch (e: any) {
              console.error("[public/chat/stream] intake error:", e.message);
            }
          });
        }

        // 6) 메타 프레임.
        // message_id 를 반드시 실어 보낸다 — 화면은 말풍선에 임시 번호(`ai_<시각>`)를 붙이는데,
        // 그 값으로 답변 평가를 보내면 chat_feedback.message_id(uuid) 형식에 걸려 500 이 나고
        // 평가가 «한 건도» 저장되지 않는다(2026-08-20 실측: 챗 메시지 1,068건 대비 평가 0건).
        const meta = {
          ok: true,
          message_id: aiMsg?.id || null,
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
