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

import { NextRequest } from "next/server";
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
  createEmptyIntake,
  computeMissingFields,
  computeExtractionConfidence,
} from "@/lib/intakeSchema";
import {
  bodyPartFromText,
  contraindicationsAndFlagsFromMessage,
  extractTimelineFromQuery,
  extractBudgetFromQuery,
  extractDurationFromQuery,
  extractSeverityFromQuery,
} from "@/lib/intakeExtract";
import { encryptStringNullable } from "@/lib/security/encryptionV2";

const INTAKE_EVERY_N_TURNS = 3;
const MAX_ATTACHMENTS = 5;

// 환자가 자료(검사결과지·사진)를 올렸을 때 접수 확인 멘트 (6개 언어).
// ⚠️ AI는 의료자료를 판독/진단하지 않음(의료법·안전규칙) → "접수+의료진 검토"로만 안내.
const ATTACHMENT_ACK: Record<string, string> = {
  ko: "📎 자료 잘 받았습니다. 안전하게 보관됐고, 의료진·코디네이터가 직접 검토한 뒤 정확히 안내드릴게요. (AI는 검사결과를 판독하지 않습니다.)",
  en: "📎 Got your file — it's safely stored. Our medical team/coordinator will review it personally and follow up. (The AI does not interpret medical results.)",
  ru: "📎 Файл получен и надёжно сохранён. Наш врач/координатор лично изучит его и свяжется с вами. (ИИ не интерпретирует медицинские результаты.)",
  kz: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  kk: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  zh: "📎 已收到您的文件并安全保存。我们的医疗团队/协调员会亲自查看并与您联系。（AI 不会解读医疗检查结果。）",
  ja: "📎 ファイルを受け取り安全に保管しました。医療チーム・コーディネーターが直接確認しご連絡します。（AIは検査結果を判読しません。）",
};

// 클라이언트가 보낸 첨부 목록 검증·정제. 업로드 라우트가 항상 inquiry/ 접두사로
// 저장하므로 그 외 경로는 거부(경로조작·임의참조 차단). 최대 5개.
function sanitizeAttachments(input: unknown): Array<{ path: string; name: string | null; type: string | null }> {
  if (!Array.isArray(input)) return [];
  const out: Array<{ path: string; name: string | null; type: string | null }> = [];
  for (const a of input.slice(0, MAX_ATTACHMENTS)) {
    if (!a || typeof a !== "object") continue;
    const path = typeof (a as any).path === "string" ? (a as any).path : "";
    if (!path.startsWith("inquiry/") || path.includes("..") || path.length > 500) continue;
    out.push({
      path,
      name: typeof (a as any).name === "string" ? (a as any).name.slice(0, 300) : null,
      type: typeof (a as any).type === "string" ? (a as any).type.slice(0, 100) : null,
    });
  }
  return out;
}

// 핸드오프 확인 멘트 (6개 언어) — "다시 입력 안 해도 됨" 명시. 대화 내용은 이미 서버 저장됨.
const HANDOFF_CONFIRM: Record<string, string> = {
  ko: "🔔 접수됐어요. 지금까지 말씀해주신 내용은 그대로 저장됐고, healwith 코디네이터가 곧 연락드립니다. 다시 입력하실 필요 없어요.",
  en: "🔔 You're registered. Everything you shared here is saved — a healwith coordinator will reach out shortly. No need to re-enter anything.",
  ru: "🔔 Заявка принята. Всё, что вы рассказали, сохранено — координатор healwith скоро свяжется с вами. Повторно вводить ничего не нужно.",
  kk: "🔔 Өтінім қабылданды. Айтқандарыңыз сақталды — healwith үйлестірушісі жақын арада хабарласады. Қайта енгізудің қажеті жоқ.",
  zh: "🔔 已为您登记。您在此提供的信息都已保存，healwith 协调员会尽快与您联系，无需重新填写。",
  ja: "🔔 受付しました。お話しいただいた内容は保存済みです。healwithのコーディネーターからまもなくご連絡します。再入力は不要です。",
};

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  // DB 기반 회수제한 + AI 비용 가드 (IP 일일 상한 · 전역 총량 차단기)
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const aiGuard = await checkAiGuards(clientIp, "/api/public/chat/message");
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

    if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
      try {
        await createDraftIntake(thread, (history || []) as any, lang);
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
      hand_off: escalate ? { requested: true, reason: escalateReason } : undefined,
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

  const { data, error } = await (supabaseAdmin as any)
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
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ normalized_inquiry_id: data.id })
      .eq("id", thread.id);
  }
}
