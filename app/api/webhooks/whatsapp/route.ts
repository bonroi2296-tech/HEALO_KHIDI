/**
 * healwith: 환자용 왓츠앱 봇 — 인바운드 웹훅 (Meta WhatsApp Cloud API)
 *
 * 텔레그램 웹훅(webhooks/telegram)과 같은 골격: 서명 검증 → 동의 게이트(동의 전 본문
 * 미저장) → 멱등(메시지 id) → 저장 → after()에서 AI 응대(핸드오프·코디 인수 시 침묵).
 * 개통 절차·env 는 docs/WHATSAPP_BOT_SETUP.md.
 *
 * 텔레그램과 다른 점:
 *  - GET: Meta 웹훅 등록 핸드셰이크(hub.challenge 에코) — 텔레그램엔 없음.
 *  - POST 위조 차단: 헤더 secret 이 아니라 X-Hub-Signature-256(HMAC-SHA256, raw body) 검증.
 *  - 동의 버튼: callback_query 가 아니라 messages[] 안의 interactive.button_reply 로 온다.
 *  - 언어: language_code 미제공 → 전화 국가번호로 추정(waLang.ts), 이후 AI 가 사용자 언어 추종.
 *  - 발신 24시간 창: 어댑터(whatsapp.ts)가 windowExpired 로 구분(AI 즉답은 항상 창 안).
 */

export const runtime = "nodejs";

import crypto, { timingSafeEqual, createHmac } from "crypto";
import { NextRequest } from "next/server";
import { after } from "next/server";
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
  sendWhatsAppPatientMessage,
  sendWhatsAppConsentPrompt,
} from "@/lib/messaging/whatsapp";
import { CONSENT_WELCOME, TG_APOLOGY, pickTgText } from "@/lib/messaging/telegram";
import { mapWaLang } from "@/lib/messaging/waLang";

// 파일/사진/음성 안내 — v1 은 왓츠앱 미디어 수신 미지원(다운로드 파이프 없음). 텔레그램과 동일 정책.
const FILE_GUIDE: Record<string, string> = {
  ko: "📎 파일은 아직 왓츠앱에서 받지 못해요. 웹 채팅(healwith.co.kr)에서 올려주시거나, 내용을 글로 설명해 주세요.",
  en: "📎 I can't receive files on WhatsApp yet. Please upload them in the web chat (healwith.co.kr) or describe the contents in text.",
  ru: "📎 Пока я не могу принимать файлы в WhatsApp. Загрузите их в веб-чате (healwith.co.kr) или опишите содержимое текстом.",
  kz: "📎 Әзірге WhatsApp-та файл қабылдай алмаймын. Оларды веб-чатқа (healwith.co.kr) жүктеңіз немесе мазмұнын мәтінмен сипаттаңыз.",
  zh: "📎 目前无法在 WhatsApp 接收文件。请在网页聊天（healwith.co.kr）上传，或用文字描述内容。",
  ja: "📎 現在WhatsAppではファイルを受け取れません。ウェブチャット（healwith.co.kr）でアップロードいただくか、内容を文字でお知らせください。",
};

function threadMeta(thread: any): Record<string, any> {
  return thread?.metadata && typeof thread.metadata === "object" && !Array.isArray(thread.metadata)
    ? thread.metadata
    : {};
}

async function findOpenThread(waId: string) {
  const { data } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("*")
    .eq("channel", "whatsapp")
    .eq("metadata->whatsapp->>wa_id", waId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function createThread(waId: string, profileName: string | null) {
  const lang = mapWaLang(waId);
  const { data, error } = await (supabaseAdmin as any)
    .from("chat_threads")
    .insert({
      status: "open",
      public_token: crypto.randomUUID(),
      subject: "WhatsApp Chat",
      channel: "whatsapp",
      // 왓츠앱 프로필 표시명은 PII → 텔레그램·웹 게스트와 동일하게 암호화 저장.
      guest_name: encryptStringNullable(profileName),
      last_active_at: new Date().toISOString(),
      metadata: {
        language: lang,
        // wa_id 는 회신 라우팅 식별자(전화번호 형식이지만 텔레그램 chat_id 와 동급 역할) — 평문 metadata.
        whatsapp: { wa_id: waId },
        utm: { source: "whatsapp_bot" },
        started_at: new Date().toISOString(),
      },
    })
    .select("*")
    .single();
  if (error) {
    console.error("[webhooks/whatsapp] thread insert:", error.message);
    return null;
  }
  return data;
}

// 웹·텔레그램과 동일한 '비답변 제외 + 최근 N개' 모델 히스토리 규칙.
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

// ── GET: Meta 웹훅 등록 핸드셰이크 ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (verifyToken && mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json({ ok: false, error: "verification_failed" }, { status: 403 });
}

// ── POST: 메시지 수신 ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !process.env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("[webhooks/whatsapp] skipped: not configured");
    return Response.json({ ok: false, error: "not_configured" }, { status: 200 });
  }

  // 위조 차단 — Meta 는 raw body 의 HMAC-SHA256(App Secret 키)을 X-Hub-Signature-256 로 보낸다.
  const raw = await request.text();
  const given = request.headers.get("x-hub-signature-256") || "";
  const expected = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  assertSupabaseEnv();

  try {
    const update = JSON.parse(raw || "null");
    const value = update?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    // 배달 영수증(statuses)·읽음 등 메시지 아닌 이벤트는 조용히 통과.
    if (!msg) return Response.json({ ok: true, skipped: "no_message" });

    const waId = String(msg.from || "");
    if (!waId) return Response.json({ ok: true, skipped: "no_wa_id" });
    const profileName = value?.contacts?.[0]?.profile?.name || null;

    // 남용 방어 — wa_id 기준 분당 상한(텔레그램 tg:<chat_id> 와 동일 정책).
    const rl = await checkRateLimitPersistent(`wa:${waId}`, RATE_LIMITS.CHAT);
    if (!rl.allowed) return Response.json({ ok: true, skipped: "rate_limited" });

    let thread = await findOpenThread(waId);
    if (!thread) {
      thread = await createThread(waId, profileName);
      if (!thread) return Response.json({ ok: true, skipped: "thread_failed" });
    }
    const meta = threadMeta(thread);
    const lang = meta.language || mapWaLang(waId);
    const hasConsent = meta.consent?.health_crossborder === true;

    // ── 동의 버튼(interactive.button_reply) ────────────────────────────────
    const buttonId = String(msg?.interactive?.button_reply?.id || "");
    if (buttonId.startsWith("consent:")) {
      // 텔레그램 동의와 동일한 멱등 패턴 — 조건부 UPDATE(consent 가 아직 없을 때만)가
      // 더블탭·재전송을 직렬화해 환영 인사를 정확히 1회만 보낸다.
      let firstConsent = false;
      if (!hasConsent) {
        const consentRecord = {
          health_crossborder: true,
          version: buttonId.slice("consent:".length).slice(0, 20) || null,
          at: new Date().toISOString(),
        };
        const { data: updated } = await (supabaseAdmin as any)
          .from("chat_threads")
          .update({
            updated_at: new Date().toISOString(),
            metadata: { ...meta, consent: consentRecord },
          })
          .eq("id", thread.id)
          .is("metadata->consent->>health_crossborder", null)
          .select("id");
        firstConsent = !!updated?.length;
      }
      if (firstConsent) {
        await sendWhatsAppPatientMessage(waId, pickTgText(CONSENT_WELCOME, lang));
      }
      return Response.json({ ok: true });
    }

    // ── 일반 메시지 ────────────────────────────────────────────────────────
    // 텍스트: text.body / 미디어 캡션: <type>.caption (텔레그램 caption 유실 교훈 반영).
    const text = String(
      msg?.text?.body ?? msg?.image?.caption ?? msg?.document?.caption ?? msg?.video?.caption ?? ""
    ).trim();
    const hasAttachment = !!(msg.image || msg.document || msg.video || msg.audio || msg.voice || msg.sticker);

    // PIPA: 동의 전 본문 미저장 — 동의 버튼만 안내(텔레그램·웹과 동일 게이트).
    if (!hasConsent) {
      await sendWhatsAppConsentPrompt(waId, lang);
      return Response.json({ ok: true });
    }

    if (!text) {
      await sendWhatsAppPatientMessage(waId, pickTgText(FILE_GUIDE, lang));
      return Response.json({ ok: true });
    }

    // 멱등 — Meta 는 비-2xx 시 같은 메시지를 재전송. 같은 wamid 저장 이력으로 판정하고
    // 최종 방어선은 부분 유니크 인덱스(migrations/20260723_chat_messages_wa_uidx.sql).
    const wamid = String(msg.id || "");
    if (wamid) {
      const { data: dup } = await (supabaseAdmin as any)
        .from("chat_messages")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("metadata->>wa_message_id", wamid)
        .limit(1);
      if (dup?.length) return Response.json({ ok: true, skipped: "duplicate" });
    }

    const { error: patientErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        actor_type: "patient",
        message_text: text,
        metadata: {
          wa_message_id: wamid || null,
          ...(hasAttachment ? { wa_has_attachment: true } : {}),
        },
      });
    if (patientErr) {
      if (patientErr.code === "23505") return Response.json({ ok: true, skipped: "duplicate" });
      console.error("[webhooks/whatsapp] patient insert:", patientErr.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    const alreadyHandedOff = meta.hand_off_requested === true;
    const coordinatorActive = meta.coordinator_active === true;
    const handOff = detectHandOff(text);

    const { error: threadUpdErr } = await (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ...(handOff.requested
          ? {
              metadata: {
                ...meta,
                hand_off_requested: true,
                hand_off_reason: meta.hand_off_reason || handOff.reason,
                hand_off_at: meta.hand_off_at || new Date().toISOString(),
                hand_off_notified: true,
              },
            }
          : {}),
      })
      .eq("id", thread.id);
    if (threadUpdErr) console.error("[webhooks/whatsapp] thread update:", threadUpdErr.message);

    after(async () => {
      try {
        if (handOff.requested && !meta.hand_off_notified) {
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: handOff.reason });
          } catch (e: any) {
            console.warn("[webhooks/whatsapp] handoff bell 실패(무시):", e?.message);
          }
        }

        if (alreadyHandedOff || coordinatorActive) return;

        const aiGuard = await checkAiGuards(`wa:${waId}`, "/api/webhooks/whatsapp");
        if (!aiGuard.allowed) {
          await sendWhatsAppPatientMessage(waId, pickTgText(TG_APOLOGY, lang));
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: "ai_guard_blocked" });
          } catch (e: any) {
            console.warn("[webhooks/whatsapp] aiGuard bell 실패(무시):", e?.message);
          }
          return;
        }

        const { data: historyDesc } = await (supabaseAdmin as any)
          .from("chat_messages")
          .select("actor_type, message_text, metadata")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(30);
        const history = (historyDesc || []).slice().reverse();

        const r = await generateChatReply(toModelHistory(history), text, lang, thread.id, {
          isLoggedIn: false,
          hasReachableContact: true,
          // 이 채팅 자체가 연락 채널 → 연락처·선호 채널 되묻기 금지(텔레그램과 동일).
          contactInThisChannel: true,
          hasAttachments: hasAttachment || history.some((m: any) => m?.metadata?.wa_has_attachment),
        });

        let finalReply = r.reply || "";
        if (handOff.requested) {
          finalReply = `${finalReply ? finalReply + "\n\n" : ""}${pickHandoffConfirm(lang, true, true)}`;
        }
        if (hasAttachment) {
          finalReply = `${finalReply ? finalReply + "\n\n" : ""}${pickTgText(FILE_GUIDE, lang)}`;
        }
        if (!finalReply) finalReply = pickTgText(TG_APOLOGY, lang);

        const redlineFlags = r.redlineBlocked?.length ? r.redlineBlocked : null;
        if (redlineFlags && !handOff.requested) {
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: "ai_redline" });
          } catch (e: any) {
            console.warn("[webhooks/whatsapp] redline bell 실패(무시):", e?.message);
          }
        }

        const { sent } = await sendWhatsAppPatientMessage(waId, finalReply);

        const { data: aiMsg, error: aiInsertErr } = await (supabaseAdmin as any)
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
              ...(sent ? {} : { delivery: "failed" }),
            },
          })
          .select("id")
          .single();
        if (aiInsertErr) console.error("[webhooks/whatsapp] system insert:", aiInsertErr.message);

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

        // 3턴마다 문의서 초안 + KHIDI 집계(inquiries) 승격 — 웹·텔레그램과 동일 주기.
        const patientMsgCount = history.filter((m: any) => m.actor_type === "patient").length;
        if (patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0) {
          try {
            await createDraftIntake(thread, history as any, lang, null);
          } catch (e: any) {
            console.error("[webhooks/whatsapp] intake error:", e.message);
          }
        }
      } catch (e: any) {
        // after 안의 실패는 응답에 못 싣는다 — 환자에게 고정 사과문만(원문 노출 금지).
        console.error("[webhooks/whatsapp] after() error:", e?.message);
        await sendWhatsAppPatientMessage(waId, pickTgText(TG_APOLOGY, lang));
      }
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[webhooks/whatsapp] Unexpected:", err?.message);
    // 파싱 불능·예상외 오류는 재시도해도 같음 → 200 으로 닫아 재전송 폭주 방지.
    return Response.json({ ok: false, error: "internal_error" }, { status: 200 });
  }
}
