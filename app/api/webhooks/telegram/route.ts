/**
 * healwith: 환자용 텔레그램 봇 웹훅 — 외부 메신저 상담을 기존 AI 챗 파이프라인에 연결
 *
 * POST /api/webhooks/telegram (Telegram Bot API → 우리 서버)
 *
 * 왜: /inquiry "Human Agent"가 wa.me 개인 링크로 내보내면 상담 데이터가 시스템 밖으로
 * 새서 ①자기학습 루프(playbook→RAG)가 굶고 ②KHIDI 상담 집계(inquiries)에 0으로 잡힌다.
 * 환자는 쓰던 텔레그램 그대로(이탈 0), 대화만 chat_threads 를 통과시키는 인바운드 어댑터.
 *
 * 처리 규칙:
 * - 보안: X-Telegram-Bot-Api-Secret-Token 을 timingSafeEqual 검증(불일치 401).
 *   env 미설정이면 200 skip(livekit 패턴 — 텔레그램 재시도 폭주 방지).
 * - PIPA: 동의(metadata.consent.health_crossborder) 전에는 본문을 저장하지 않고
 *   동의 버튼만 재안내(동의 전 민감 건강정보 미처리). 동의 shape 는 웹 챗과 동일.
 * - 코디 인수 후 AI 침묵: hand_off_requested 스레드에는 AI 가 답하지 않는다
 *   (웹과 달리 텔레그램은 코디 답장이 같은 창으로 오므로 AI 가 끼어들면 혼선).
 * - 에러는 코드형만 — err.message 를 환자에게 회신 금지(고정 사과문).
 */

export const runtime = "nodejs";
export const maxDuration = 60; // after() 안의 LLM 호출 보호

import { NextRequest, after } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, RATE_LIMITS } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import { encryptStringNullable } from "@/lib/security/encryptionV2";
import {
  generateChatReply,
  detectHandOff,
  getModelName,
  logPlaybookUsage,
} from "@/lib/chat/generateReply";
import {
  INTAKE_EVERY_N_TURNS,
  createDraftIntake,
  pickHandoffConfirm,
} from "@/lib/chat/publicChatHelpers";
import {
  sendTelegramPatientMessage,
  sendConsentPrompt,
  answerCallbackQuery,
  CONSENT_WELCOME,
  TG_APOLOGY,
  pickTgText,
} from "@/lib/messaging/telegram";

// 텔레그램 language_code(IETF) → 사이트 활성 6개 언어. 카자흐어는 ISO 'kk' 로 오지만
// 이 코드베이스의 언어 키는 'kz'(src/lib/i18n) — 여기서 정규화한다. 미지원은 en 폴백.
function mapTgLang(code: unknown): string {
  const primary = String(code || "").toLowerCase().split("-")[0];
  if (primary === "kk") return "kz";
  return ["ko", "en", "ru", "kz", "zh", "ja"].includes(primary) ? primary : "en";
}

function safeSecretEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function threadMeta(thread: any): Record<string, any> {
  return thread?.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
    ? thread.metadata
    : {};
}

// chat_id 로 살아있는(open) 텔레그램 스레드 조회 — resolved/closed 는 새 대화로 취급
// (재상담은 새 스레드 + 재동의: PIPA 증빙이 대화 단위로 남는 게 안전).
async function findOpenThread(chatId: string) {
  const { data } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("*")
    .eq("channel", "telegram")
    .eq("metadata->telegram->>chat_id", chatId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function createThread(chatId: string, from: any, startParam: string | null) {
  const lang = mapTgLang(from?.language_code);
  const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(" ").trim() || null;
  const { data, error } = await (supabaseAdmin as any)
    .from("chat_threads")
    .insert({
      status: "open",
      public_token: crypto.randomUUID(),
      subject: "Telegram Chat",
      channel: "telegram",
      // 텔레그램 표시명은 PII → 웹 챗 게스트와 동일하게 암호화 저장.
      guest_name: encryptStringNullable(fullName),
      last_active_at: new Date().toISOString(),
      metadata: {
        language: lang,
        // chat_id/username 은 회신 라우팅 식별자(browser_session_id 와 동급) — 평문 metadata.
        telegram: { chat_id: chatId, username: from?.username || null },
        utm: { source: "telegram_bot", start_param: startParam },
        started_at: new Date().toISOString(),
      },
    })
    .select("*")
    .single();
  if (error) {
    console.error("[webhooks/telegram] thread insert:", error.message);
    return null;
  }
  return data;
}

// 웹 message 라우트와 동일한 '비답변 제외 + 최근 N개' 모델 히스토리 구성 규칙
// (환자·코디 메시지는 유지, 시스템의 에러 폴백·빈 텍스트만 제외).
const MODEL_HISTORY_LIMIT = 12;
function toModelHistory(history: any[]): Array<{ role: "user" | "assistant"; content: string }> {
  return (history || [])
    .filter((m: any) => {
      if (m.actor_type !== "system") return true;
      if (m?.metadata?.ai_error) return false;
      return !!String(m.message_text || "").trim();
    })
    .slice(-MODEL_HISTORY_LIMIT)
    .map((m: any) => ({
      role: m.actor_type === "patient" ? ("user" as const) : ("assistant" as const),
      content: m.message_text,
    }));
}

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_PATIENT_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!botToken || !webhookSecret) {
    // 설정 전이면 silent skip (200 — 텔레그램 재시도 폭주 방지, livekit/webhook 패턴)
    console.warn("[webhooks/telegram] skipped: bot token/secret not configured");
    return Response.json({ ok: false, error: "not_configured" }, { status: 200 });
  }

  // 위조 차단 — setWebhook 때 등록한 secret_token 이 모든 정품 요청에 실려 온다.
  const given = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!safeSecretEqual(given, webhookSecret)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  assertSupabaseEnv();

  try {
    const update = await request.json().catch(() => null);
    if (!update || typeof update !== "object") {
      return Response.json({ ok: true, skipped: "unparseable" });
    }

    // ── 동의 버튼(callback_query) ─────────────────────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = String(cq.message?.chat?.id ?? cq.from?.id ?? "");
      const data = String(cq.data || "");
      if (!chatId || !data.startsWith("consent:")) {
        if (cq.id) await answerCallbackQuery(cq.id);
        return Response.json({ ok: true, skipped: "unknown_callback" });
      }
      let thread = await findOpenThread(chatId);
      if (!thread) thread = await createThread(chatId, cq.from, null);
      if (!thread) return Response.json({ ok: true, skipped: "thread_failed" });

      const meta = threadMeta(thread);
      const lang = meta.language || mapTgLang(cq.from?.language_code);
      if (meta.consent?.health_crossborder !== true) {
        // 웹 챗(start 라우트)과 동일 shape — 승격 시 동의 증빙 복사가 그대로 작동.
        const consentRecord = {
          health_crossborder: true,
          version: data.slice("consent:".length).slice(0, 20) || null,
          at: new Date().toISOString(),
        };
        await (supabaseAdmin as any)
          .from("chat_threads")
          .update({
            updated_at: new Date().toISOString(),
            metadata: { ...meta, consent: consentRecord },
          })
          .eq("id", thread.id);
      }
      if (cq.id) await answerCallbackQuery(cq.id);
      await sendTelegramPatientMessage(chatId, pickTgText(CONSENT_WELCOME, lang));
      return Response.json({ ok: true });
    }

    // ── 일반 메시지 ───────────────────────────────────────────────────────
    const msg = update.message;
    if (!msg) return Response.json({ ok: true, skipped: "ignored_update" });
    // 1:1 상담 봇 — 그룹/채널 메시지는 처리하지 않음.
    if (msg.chat?.type && msg.chat.type !== "private") {
      return Response.json({ ok: true, skipped: "non_private" });
    }
    const chatId = String(msg.chat?.id ?? "");
    if (!chatId) return Response.json({ ok: true, skipped: "no_chat_id" });

    // 남용 방어 — chat_id 기준 분당 상한(웹 챗과 동일 정책). 초과분은 조용히 버림(200).
    const rl = await checkRateLimitPersistent(`tg:${chatId}`, RATE_LIMITS.CHAT);
    if (!rl.allowed) return Response.json({ ok: true, skipped: "rate_limited" });

    const text = typeof msg.text === "string" ? msg.text.trim() : "";
    const isStart = text.startsWith("/start");

    let thread = await findOpenThread(chatId);
    if (!thread) {
      const startParam = isStart ? text.split(/\s+/)[1] || null : null;
      thread = await createThread(chatId, msg.from, startParam);
      if (!thread) return Response.json({ ok: true, skipped: "thread_failed" });
    }
    const meta = threadMeta(thread);
    const lang = meta.language || "en";
    const hasConsent = meta.consent?.health_crossborder === true;

    // /start 또는 동의 전 메시지: 본문을 저장하지 않고(동의 전 민감정보 미처리) 동의만 안내.
    if (isStart || !hasConsent) {
      if (!hasConsent) {
        await sendConsentPrompt(chatId, lang);
      } else if (isStart) {
        await sendTelegramPatientMessage(chatId, pickTgText(CONSENT_WELCOME, lang));
      }
      return Response.json({ ok: true });
    }

    // 파일/사진/음성 등 비텍스트 — v1 은 텔레그램 파일 수신 미지원(다운로드 파이프 없음).
    // 거짓 약속("검토할게요") 대신 웹 챗 업로드로 정직하게 안내. 텍스트 병행 메시지는 아래로 계속.
    if (!text) {
      const FILE_GUIDE: Record<string, string> = {
        ko: "📎 파일은 아직 텔레그램에서 받지 못해요. 웹 채팅(healwith.co.kr)에서 올려주시거나, 내용을 글로 설명해 주세요.",
        en: "📎 I can't receive files on Telegram yet. Please upload them in the web chat (healwith.co.kr) or describe the contents in text.",
        ru: "📎 Пока я не могу принимать файлы в Telegram. Загрузите их в веб-чате (healwith.co.kr) или опишите содержимое текстом.",
        kz: "📎 Әзірге Telegram-да файл қабылдай алмаймын. Оларды веб-чатқа (healwith.co.kr) жүктеңіз немесе мазмұнын мәтінмен сипаттаңыз.",
        zh: "📎 目前无法在 Telegram 接收文件。请在网页聊天（healwith.co.kr）上传，或用文字描述内容。",
        ja: "📎 現在Telegramではファイルを受け取れません。ウェブチャット（healwith.co.kr）でアップロードいただくか、内容を文字でお知らせください。",
      };
      await sendTelegramPatientMessage(chatId, pickTgText(FILE_GUIDE, lang));
      return Response.json({ ok: true });
    }

    // 중복 배달 방지 — 텔레그램은 비-2xx 시 같은 update 를 재전송한다. 스레드에 마지막
    // 처리 update_id 를 남겨 재전송·역전 도착을 걸러낸다(웹훅 멱등성).
    const updateId = Number(update.update_id || 0);
    const lastUpdateId = Number(meta.telegram?.last_update_id || 0);
    if (updateId && lastUpdateId && updateId <= lastUpdateId) {
      return Response.json({ ok: true, skipped: "duplicate" });
    }

    const { error: patientErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        actor_type: "patient",
        message_text: text,
        metadata: { tg_update_id: updateId || null, tg_message_id: msg.message_id ?? null },
      });
    if (patientErr) {
      console.error("[webhooks/telegram] patient insert:", patientErr.message);
      // 저장 실패는 재시도 가치가 있다 → 비-2xx 로 텔레그램 재전송 유도(위 멱등 가드가 중복을 막음).
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    const alreadyHandedOff = meta.hand_off_requested === true;
    const handOff = detectHandOff(text);

    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        metadata: {
          ...meta,
          telegram: { ...(meta.telegram || {}), last_update_id: updateId || lastUpdateId || null },
          ...(handOff.requested
            ? {
                hand_off_requested: true,
                hand_off_reason: handOff.reason,
                hand_off_at: meta.hand_off_at || new Date().toISOString(),
              }
            : {}),
        },
      })
      .eq("id", thread.id);

    // 응답을 먼저 닫고(텔레그램 타임아웃·재전송 방지) LLM·발신은 after 로.
    after(async () => {
      try {
        // 핸드오프 종은 스레드당 1회(도배 방지 — 웹 message 라우트와 동일 규칙).
        if (handOff.requested && !meta.hand_off_notified) {
          await (supabaseAdmin as any)
            .from("chat_threads")
            .update({
              metadata: {
                ...meta,
                telegram: { ...(meta.telegram || {}), last_update_id: updateId || null },
                hand_off_requested: true,
                hand_off_reason: handOff.reason,
                hand_off_at: meta.hand_off_at || new Date().toISOString(),
                hand_off_notified: true,
              },
            })
            .eq("id", thread.id);
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: handOff.reason });
          } catch (e: any) {
            console.warn("[webhooks/telegram] handoff bell 실패(무시):", e?.message);
          }
        }

        // 코디 인수 후 AI 침묵 — 이미 핸드오프된 스레드에는 봇이 끼어들지 않는다.
        if (alreadyHandedOff) return;

        // AI 비용 가드(일일·전역) — 초과 시 조용히 생성 생략(코디가 이어받을 수 있음).
        const aiGuard = await checkAiGuards(`tg:${chatId}`, "/api/webhooks/telegram");
        if (!aiGuard.allowed) return;

        const { data: history } = await (supabaseAdmin as any)
          .from("chat_messages")
          .select("actor_type, message_text, metadata")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: true })
          .limit(30);

        const r = await generateChatReply(toModelHistory(history || []), text, lang, thread.id, {
          isLoggedIn: false,
          // 텔레그램은 이 창으로 항상 회신 가능 → "연락처 남겨달라" 거짓 게이트 방지.
          hasReachableContact: true,
        });

        let finalReply = r.reply || "";
        if (handOff.requested) {
          finalReply = `${finalReply ? finalReply + "\n\n" : ""}${pickHandoffConfirm(lang, true)}`;
        }
        if (!finalReply) finalReply = pickTgText(TG_APOLOGY, lang);

        const redlineFlags = r.redlineBlocked?.length ? r.redlineBlocked : null;
        if (redlineFlags && !handOff.requested) {
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: "ai_redline" });
          } catch (e: any) {
            console.warn("[webhooks/telegram] redline bell 실패(무시):", e?.message);
          }
        }

        const delivered = await sendTelegramPatientMessage(chatId, finalReply);

        const { data: aiMsg } = await (supabaseAdmin as any)
          .from("chat_messages")
          .insert({
            thread_id: thread.id,
            actor_type: "system",
            message_text: finalReply,
            metadata: {
              model: getModelName(),
              rag_chunks_used: r.ragChunks?.length || 0,
              hand_off: handOff.requested ? handOff.reason : redlineFlags ? "ai_redline" : null,
              ...(redlineFlags ? { redline: redlineFlags, needs_doctor_review: true } : {}),
              ...(r.error ? { ai_error: r.error } : {}),
              ...(delivered ? {} : { delivery: "failed" }),
            },
          })
          .select("id")
          .single();

        if (r._analytics) {
          await logPlaybookUsage({
            threadId: thread.id,
            messageId: aiMsg?.id || null,
            language: lang,
            queryText: text,
            model: getModelName(),
            analytics: r._analytics,
            handoffRequested: handOff.requested,
          });
        }

        // 3턴마다 문의서 초안 + KHIDI 집계(inquiries) 승격 — 웹 챗과 동일 주기.
        const patientMsgCount = (history || []).filter((m: any) => m.actor_type === "patient").length;
        if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
          try {
            await createDraftIntake(thread, (history || []) as any, lang, null);
          } catch (e: any) {
            console.error("[webhooks/telegram] intake error:", e.message);
          }
        }
      } catch (e: any) {
        // after 안의 실패는 응답에 못 싣는다 — 환자에게 고정 사과문만(원문 노출 금지).
        console.error("[webhooks/telegram] after() error:", e?.message);
        await sendTelegramPatientMessage(chatId, pickTgText(TG_APOLOGY, lang));
      }
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[webhooks/telegram] Unexpected:", err?.message);
    // 파싱 불능·예상외 오류는 재시도해도 같음 → 200 으로 닫아 재전송 폭주 방지.
    return Response.json({ ok: false, error: "internal_error" }, { status: 200 });
  }
}
