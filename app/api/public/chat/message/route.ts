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
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
  modelBypassKind,
} from "@/lib/chat/generateReply";
import {
  INTAKE_EVERY_N_TURNS,
  ATTACHMENT_ACK,
  sanitizeAttachments,
  createDraftIntake,
  hasReachableContact,
  pickHandoffConfirm,
  stripFalseIntakeConfirm,
} from "@/lib/chat/publicChatHelpers";

// 공개 라우트지만 same-origin fetch 라 Supabase 인증 쿠키가 함께 옴 → 로그인 사용자면 식별 가능.
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

    // 인코딩 깨진 본문(U+FFFD) 거부 — 깨진 한글이 chat_threads→inquiries 승격까지 그대로 박힘 (POSTMORTEMS #92)
    if (hasMojibake(body)) {
      return Response.json(
        { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
        { status: 400 }
      );
    }

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

    // PIPA: 민감 건강정보 처리 전 동의 필수 — stream 라우트(:95-99)와 동일 게이트.
    // 이 라우트만 게이트가 빠져 동의 없는 옛 스레드로 우회 가능하던 드리프트를 봉합(2026-07-02 전수 감사).
    if (thread.metadata?.consent?.health_crossborder !== true) {
      return Response.json({ ok: false, error: "consent_required" }, { status: 403 });
    }

    // 로그인 연동: 익명 시작 스레드라도 로그인 사용자가 쓰면 계정 연결(미연결일 때만 auth 조회).
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
        } catch (e: any) {
          console.warn("[chat/message] handoff bell 실패(무시):", e?.message);
        }
      }
    }

    const { data: history } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("actor_type, message_text, metadata")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(30);

    // 모델에 넣을 대화 맥락 구성 — '비답변' 시스템 메시지를 제외하고 최근 N개로 제한한다.
    // 왜(2026-06-21 실데이터 확인): 빈응답 에러 폴백("죄송합니다 답변을 만들지 못했어요")·자료접수
    // ACK·빈 텍스트 같은 비답변 메시지가 기록에 쌓이면, 모델이 그 사과·되묻기 패턴을 흉내 내
    // 명확한 질문("대장암 치료법 알려줘")에도 인사로만 답하는 버그가 발생. 또 오래된 잘린 답변·
    // 누수된 추론 텍스트의 오염을 끊기 위해 최근 MODEL_HISTORY_LIMIT 개만 사용. (저장 자체는 보존)
    const MODEL_HISTORY_LIMIT = 12;
    const chatMessages = (history || [])
      .filter((m: any) => {
        if (m.actor_type !== "system") return true;          // 환자 메시지는 항상 유지
        if (m?.metadata?.ai_error) return false;             // 빈응답·에러 폴백 제외
        if (m?.metadata?.attachment_ack) return false;       // 자료접수 안내(비답변) 제외
        return !!String(m.message_text || "").trim();        // 빈 텍스트 제외
      })
      .slice(-MODEL_HISTORY_LIMIT)
      .map((m: any) => ({
        role: m.actor_type === "patient" ? "user" as const : "assistant" as const,
        content: m.message_text,
      }));

    const lang = threadMeta.language || "en";

    // 자료만 올린 경우(질문 텍스트 없음)는 AI를 호출하지 않음 — AI는 자료 판독을 하지 않으므로
    // 빈 질의로 모델을 돌릴 이유가 없음. 접수 확인(ACK)만 즉시 응답.
    let reply = "";
    let ragChunks: any[] = [];
    let aiError: string | undefined;
    let _analytics: any = undefined;
    let redlineFlags: string[] | null = null;
    if (trimmedMsg) {
      const r = await generateChatReply(chatMessages, trimmedMsg, lang, thread_id, {
        isLoggedIn: !!thread.user_id,
        hasReachableContact: reachable,
        // 이번 턴 첨부 or 과거 첨부 스레드 → "파일 못 읽음" 하드룰 (첨부 내용 환각 방지)
        hasAttachments: hasAttachments || !!threadMeta.has_attachments,
      });
      reply = r.reply;
      ragChunks = r.ragChunks;
      aiError = r.error;
      _analytics = r._analytics;
      // 레드라인 적발(답변은 이미 안전 대체됨) — stream 라우트와 동일하게 검수 큐 기록 + 코디 종.
      redlineFlags = r.redlineBlocked?.length ? r.redlineBlocked : null;
    }
    if (redlineFlags && !escalate) {
      try {
        const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
        await notifyStaffChatHandoff({ threadId: thread_id, reason: "ai_redline" });
      } catch (e: any) {
        console.warn("[chat/message] redline bell 실패(무시):", e?.message);
      }
    }

    let finalReply = reply;
    // 자료 접수 확인(판독 아님) — 첨부가 있으면 항상 덧붙임.
    if (hasAttachments) {
      const ack = ATTACHMENT_ACK[lang] || ATTACHMENT_ACK.en;
      finalReply = finalReply ? `${finalReply}\n\n${ack}` : ack;
    }
    if (handOff.requested) {
      // 연락처가 없으면 모델이 제 입으로 "접수됐다"고 한 문장을 먼저 지운다(거짓 확정 방지).
      // 바로 아래에 붙는 안내문은 "연락처 하나만 주세요"인데, 본문이 "접수 완료"면 서로 어긋난다.
      if (!reachable) finalReply = stripFalseIntakeConfirm(finalReply);
      finalReply += "\n\n" + pickHandoffConfirm(lang, reachable);
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
          hand_off: escalate || redlineFlags ? (redlineFlags ? "ai_redline" : escalateReason) : null,
          ...(hasAttachments ? { attachment_ack: true } : {}),
          ...(redlineFlags ? { redline: redlineFlags, needs_doctor_review: true } : {}),
          ...(aiError ? { ai_error: aiError } : {}),
          // 모델을 «안 거치고» 코드가 가로챈 턴이면 그 이름을 남긴다(잡담·화제정정·마스터키).
          // 안 남기면 가로채기 오작동이 정상 답변과 구별이 안 된다 — 2026-08-28 사고가 그것이었다.
          ...(modelBypassKind(_analytics?.ragScoring) ? { bypassed: modelBypassKind(_analytics?.ragScoring) } : {}),
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
    // 에스컬레이션(사람 연결 요청·의료자료 첨부) 턴엔 3턴 규칙과 무관하게 즉시 승격 —
    // 둘 다 이 라우트가 hand_off_requested 를 세우는 사유(메신저 봇과 동일 게이트, intakeGate.ts).
    if (escalate || (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0)) {
      after(async () => {
        try {
          await createDraftIntake(thread, (history || []) as any, lang, clientIp, {
            handOffRequested: escalate,
          });
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
      // ⚠️ aiError 는 generateChatReply 의 err.message 원문일 수 있어 그대로 노출 금지
      // (CLAUDE.md 보안규칙). 발생 여부만 코드형으로(stream 라우트와 동일).
      ...(aiError ? { ai_error: "internal_error" } : {}),
    });
  } catch (err: any) {
    console.error(`[POST /api/public/chat/message] Unexpected: ${err.message}`, err.stack?.slice(0, 500));
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
