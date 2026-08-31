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
  HANDOFF_RECEIVED_ACK,
} from "@/lib/chat/publicChatHelpers";
import {
  sendTelegramPatientMessage,
  sendConsentPrompt,
  answerCallbackQuery,
  removeInlineKeyboard,
  CONSENT_WELCOME,
  TG_WELCOME_BACK,
  TG_APOLOGY,
  pickTgText,
} from "@/lib/messaging/telegram";
import {
  staffGroupId,
  findThreadByStaffTopic,
  notifyStaffTopic,
  relayToStaffTopic,
} from "@/lib/messaging/staffRelay";

// 텔레그램 language_code(IETF) → 사이트 활성 6개 언어. 카자흐어는 ISO 'kk' 로 오지만
// 이 코드베이스의 언어 키는 'kz'(src/lib/i18n) — 여기서 정규화한다. 미지원은 en 폴백.
function mapTgLang(code: unknown): string {
  const primary = String(code || "").toLowerCase().split("-")[0];
  if (primary === "kk") return "kz";
  return ["ko", "en", "ru", "kz", "zh", "ja"].includes(primary) ? primary : "en";
}

// 파일 미수신 정직 안내 — v1 은 텔레그램 파일 다운로드 파이프가 없다(활성 6개 언어).
const FILE_GUIDE: Record<string, string> = {
  ko: "📎 파일은 아직 텔레그램에서 받지 못해요. 웹 채팅(healwith.co.kr)에서 올려주시거나, 내용을 글로 설명해 주세요.",
  en: "📎 I can't receive files on Telegram yet. Please upload them in the web chat (healwith.co.kr) or describe the contents in text.",
  ru: "📎 Пока я не могу принимать файлы в Telegram. Загрузите их в веб-чате (healwith.co.kr) или опишите содержимое текстом.",
  kz: "📎 Әзірге Telegram-да файл қабылдай алмаймын. Оларды веб-чатқа (healwith.co.kr) жүктеңіз немесе мазмұнын мәтінмен сипаттаңыз.",
  zh: "📎 目前无法在 Telegram 接收文件。请在网页聊天（healwith.co.kr）上传，或用文字描述内容。",
  ja: "📎 現在Telegramではファイルを受け取れません。ウェブチャット（healwith.co.kr）でアップロードいただくか、内容を文字でお知らせください。",
};

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

// chat_id 로 살아있는 텔레그램 스레드 조회 — 종료(resolved/closed)만 새 대화로 취급
// (재상담은 종료 후 새 스레드 + 재동의: PIPA 증빙이 대화 단위로 남는 게 안전).
// ⚠️ "open"만 매칭하면 코디 답장으로 status 가 waiting_patient 로 바뀐 순간, 환자의 다음
// 메시지가 새 스레드로 갈라져 동의를 처음부터 다시 묻는다(2026-07-24 PO 실기기 재현 —
// 무표식 inquiry#41 까지 생성). 웹 챗의 종료 판정(resolved||closed)과 동일 의미로 통일.
async function findOpenThread(chatId: string) {
  const { data } = await (supabaseAdmin as any)
    .from("chat_threads")
    .select("*")
    .eq("channel", "telegram")
    .eq("metadata->telegram->>chat_id", chatId)
    .not("status", "in", "(resolved,closed)")
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
        // 딥링크 ?start=test... 또는 등록된 테스트 계정(chat_id) — inquiries 승격 시 is_test 로
        // 이어져 KHIDI 실적 오염을 막는다(독립 리뷰 C3: 텔레그램은 IP·이메일 판별이 불가능).
        // env TEST_TELEGRAM_CHAT_IDS(쉼표구분): PO 실기기가 딥링크 없이 평문으로 시작해도
        // 자동 표식(2026-07-24 무표식 inquiry#41 사고 재발 방지). 미설정이면 no-op.
        ...((startParam && /^test/i.test(startParam)) ||
        (process.env.TEST_TELEGRAM_CHAT_IDS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .includes(chatId)
          ? { is_test: true }
          : {}),
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

// ── 스태프 그룹(양방향 릴레이) — 봇 문의를 코디 텔레그램에서 보고 거기서 답장(B안 2026-07-24) ──
// 그룹 주제(topic) 1개 = 환자 스레드 1개. 주제에 쓴 글을 환자 메신저(텔레그램·왓츠앱)로 발신.
// 개통: docs/TELEGRAM_BOT_SETUP.md §스태프 그룹 (봇 privacy Disable 필수 — 아니면 그룹 글이 안 옴).
async function handleStaffGroupMessage(update: any, msg: any): Promise<Response> {
  const groupChatId = String(msg.chat?.id ?? "");
  const text = typeof msg.text === "string" ? msg.text.trim() : "";

  // 설정 도우미 — 어느 그룹에서든 /id 로 chat_id 확인(env STAFF_TELEGRAM_GROUP_ID 등록용).
  if (text === "/id" || text.startsWith("/id@")) {
    await sendTelegramPatientMessage(
      groupChatId,
      `이 그룹의 chat_id: ${groupChatId}\nVercel env STAFF_TELEGRAM_GROUP_ID 에 이 값을 넣고 재배포하면 스태프 릴레이가 켜집니다.`
    );
    return Response.json({ ok: true });
  }

  const gid = staffGroupId();
  if (!gid || groupChatId !== gid) {
    return Response.json({ ok: true, skipped: "non_private" });
  }
  // 주제 밖 일반 글·서비스 메시지(주제 생성 등)·봇 발신 글은 라우팅 대상 아님.
  const topicId = Number(msg.message_thread_id || 0);
  if (msg.from?.is_bot) {
    // 함정(독립 리뷰 P2): 그룹 관리자가 "익명으로 보내기"를 켜면 from=GroupAnonymousBot 으로
    // 와서 조용히 버려진다 — 전달된 줄 착각하지 않게 주제에 즉시 경고.
    if (topicId && msg.from?.username === "GroupAnonymousBot" && text) {
      await notifyStaffTopic(
        topicId,
        "⚠️ '익명으로 보내기(관리자 익명)'가 켜져 있으면 답장을 환자에게 전달할 수 없어요 — 익명을 끄고 다시 보내주세요."
      );
    }
    return Response.json({ ok: true, skipped: "staff_ignored" });
  }
  if (!topicId || !text) {
    return Response.json({ ok: true, skipped: "staff_ignored" });
  }

  const thread = await findThreadByStaffTopic(topicId);
  if (!thread) {
    await notifyStaffTopic(topicId, "⚠️ 이 주제와 연결된 상담을 찾지 못했어요(종료됐거나 매핑 유실). 인앱(/admin/chat)에서 답장해 주세요.");
    return Response.json({ ok: true, skipped: "staff_topic_unmapped" });
  }

  // 멱등 — 저장(클레임)을 발신보다 먼저: 같은 update 가 병렬/재배달돼도 유니크 인덱스
  // (thread_id, tg_update_id)가 한 쪽만 통과시켜 환자 이중 발신을 막는다(독립 리뷰 P3 —
  // 발신-먼저였으면 dup pre-check 를 둘 다 통과하는 창이 열림). 환자 경로와 동일한 순서.
  const updateId = Number(update.update_id || 0);
  if (updateId) {
    const { data: dup } = await (supabaseAdmin as any)
      .from("chat_messages")
      .select("id")
      .eq("thread_id", thread.id)
      .eq("metadata->>tg_update_id", String(updateId))
      .limit(1);
    if (dup?.length) return Response.json({ ok: true, skipped: "duplicate" });
  }

  const { data: staffMsg, error: staffInsertErr } = await (supabaseAdmin as any)
    .from("chat_messages")
    .insert({
      thread_id: thread.id,
      actor_type: "admin",
      message_text: text,
      metadata: {
        via: "telegram_staff",
        tg_update_id: updateId || null,
        staff_username: msg.from?.username || null,
      },
    })
    .select("id")
    .single();
  if (staffInsertErr) {
    if (staffInsertErr.code === "23505") return Response.json({ ok: true, skipped: "duplicate" });
    console.error("[webhooks/telegram] staff reply insert:", staffInsertErr.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  // 환자에게 발신 — 스레드 채널별 어댑터(스태프 답장 창구는 텔레그램 그룹 하나로 통일).
  let deliveryNote = "failed";
  if (thread.channel === "telegram") {
    const tgChatId = thread.metadata?.telegram?.chat_id;
    deliveryNote = tgChatId && (await sendTelegramPatientMessage(tgChatId, text)) ? "sent" : "failed";
  } else if (thread.channel === "whatsapp") {
    const waId = thread.metadata?.whatsapp?.wa_id;
    if (waId) {
      const { sendWhatsAppPatientMessage } = await import("@/lib/messaging/whatsapp");
      const r = await sendWhatsAppPatientMessage(waId, text);
      deliveryNote = r.sent ? "sent" : r.windowExpired ? "window_expired" : "failed";
    }
  } else {
    deliveryNote = "sent"; // 웹 챗: 저장만으로 환자 화면(스레드)에 뜬다.
  }
  if (deliveryNote !== "sent" && staffMsg?.id) {
    await (supabaseAdmin as any)
      .from("chat_messages")
      .update({
        metadata: {
          via: "telegram_staff",
          tg_update_id: updateId || null,
          staff_username: msg.from?.username || null,
          delivery: deliveryNote,
        },
      })
      .eq("id", staffMsg.id);
  }

  // 사람이 답장을 시작한 스레드에는 AI 가 끼어들지 않는다(어드민 라우트와 동일 규칙).
  // 전체 metadata 덮어쓰기 대신 키 병합 RPC(독립 리뷰 C2 부류 방지 — 그 사이 갱신된 키 보존).
  if (thread.metadata?.coordinator_active !== true) {
    const { error: mergeErr } = await (supabaseAdmin as any).rpc("chat_thread_merge_meta", {
      p_thread_id: thread.id,
      p_patch: { coordinator_active: true },
    });
    if (mergeErr) console.error("[webhooks/telegram] coordinator_active merge:", mergeErr.message);
  }

  if (deliveryNote !== "sent") {
    await notifyStaffTopic(
      topicId,
      deliveryNote === "window_expired"
        ? "⚠️ 미전달 — 왓츠앱 24시간 창 만료(환자가 다시 메시지를 보내면 답장 가능)."
        : "⚠️ 전송 실패 — 인앱(/admin/chat)에서 상태를 확인해 주세요."
    );
  }
  return Response.json({ ok: true });
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
      // 멱등: 환영 인사는 "동의를 처음 기록한 요청"만 보낸다 — 실기기에서 버튼 더블탭으로
      // 환영 인사 2회 발송 재현(2026-07-23). 순차 재수신은 메모리 판정(alreadyConsented)이,
      // 병렬 더블탭(배달은 병렬·순서 비보장)은 아래 조건부 UPDATE(consent 가 아직 없을 때만
      // 매칭)가 막는다 — DB 행 잠금이 두 요청을 직렬화해 정확히 한 쪽만 rows 를 돌려받는다.
      const alreadyConsented = meta.consent?.health_crossborder === true;
      let firstConsent = false;
      if (!alreadyConsented) {
        // 웹 챗(start 라우트)과 동일 shape — 승격 시 동의 증빙 복사가 그대로 작동.
        const consentRecord = {
          health_crossborder: true,
          version: data.slice("consent:".length).slice(0, 20) || null,
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
      if (cq.id) await answerCallbackQuery(cq.id);
      // 동의 버튼 자체를 제거해 재터치 여지를 없앤다(실패해도 위 멱등 가드가 최종 방어선).
      if (cq.message?.message_id) {
        await removeInlineKeyboard(chatId, cq.message.message_id);
      }
      if (firstConsent) {
        await sendTelegramPatientMessage(chatId, pickTgText(CONSENT_WELCOME, lang));
      }
      return Response.json({ ok: true });
    }

    // ── 일반 메시지 ───────────────────────────────────────────────────────
    const msg = update.message;
    if (!msg) return Response.json({ ok: true, skipped: "ignored_update" });
    // 그룹 메시지: 스태프 그룹(양방향 릴레이 — PO 결정 2026-07-24 B안)만 처리, 그 외 그룹 무시.
    if (msg.chat?.type && msg.chat.type !== "private") {
      return handleStaffGroupMessage(update, msg);
    }
    const chatId = String(msg.chat?.id ?? "");
    if (!chatId) return Response.json({ ok: true, skipped: "no_chat_id" });

    // 남용 방어 — chat_id 기준 분당 상한(웹 챗과 동일 정책). 초과분은 조용히 버림(200).
    const rl = await checkRateLimitPersistent(`tg:${chatId}`, RATE_LIMITS.CHAT);
    if (!rl.allowed) return Response.json({ ok: true, skipped: "rate_limited" });

    // 사진·문서에 붙은 질문은 msg.text 가 아니라 msg.caption 으로 온다 — 캡션도 질문으로 취급
    // (독립 리뷰 C4: caption 미처리 시 사진+질문에서 질문이 통째로 유실).
    const text =
      typeof msg.text === "string"
        ? msg.text.trim()
        : typeof msg.caption === "string"
          ? msg.caption.trim()
          : "";
    const hasTgAttachment = !!(
      msg.photo || msg.document || msg.video || msg.voice || msg.audio || msg.video_note
    );
    const isStart = text === "/start" || text.startsWith("/start ");

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
        // 재입장 /start: 전체 환영문 반복은 소음(실기기 2026-07-23 PO) → 한 줄 인사 +
        // 60초 스로틀. "마지막 /start 가 60초보다 이전일 때만" 조건부 UPDATE 가 병렬·연속
        // 수신을 직렬화해 정확히 한 요청만 인사를 보낸다(동의 더블탭 F1 과 동일 패턴).
        const cutoffIso = new Date(Date.now() - 60_000).toISOString();
        const { data: won, error: startErr } = await (supabaseAdmin as any)
          .from("chat_threads")
          .update({ metadata: { ...meta, last_start_at: new Date().toISOString() } })
          .eq("id", thread.id)
          .or(`metadata->>last_start_at.is.null,metadata->>last_start_at.lt.${cutoffIso}`)
          .select("id");
        // 오류면 침묵으로 수렴하지만(다음 /start 가 다시 조건 통과) 원인은 남긴다(독립 리뷰 N4).
        if (startErr) console.error("[webhooks/telegram] start throttle update:", startErr.message);
        if (won?.length) {
          await sendTelegramPatientMessage(chatId, pickTgText(TG_WELCOME_BACK, lang));
        }
      }
      return Response.json({ ok: true });
    }

    // 파일/사진/음성만 있고 텍스트·캡션이 없으면 — v1 은 텔레그램 파일 수신 미지원(다운로드
    // 파이프 없음). 거짓 약속("검토할게요") 대신 웹 챗 업로드로 정직하게 안내.
    if (!text) {
      await sendTelegramPatientMessage(chatId, pickTgText(FILE_GUIDE, lang));
      return Response.json({ ok: true });
    }

    // 중복 배달 방지(멱등) — 텔레그램은 비-2xx 시 같은 update_id 를 재전송하고, 배달은
    // 병렬·순서 비보장이다. "마지막 update_id 비교"(read-modify-write)는 역전 도착한 정상
    // 메시지를 유실시키므로(독립 리뷰 C1), 같은 update_id 의 저장 이력으로만 판정한다.
    // 최종 방어선은 chat_messages 의 부분 유니크 인덱스(마이그레이션) — 경쟁 삽입은 23505.
    const updateId = Number(update.update_id || 0);
    if (updateId) {
      const { data: dup } = await (supabaseAdmin as any)
        .from("chat_messages")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("metadata->>tg_update_id", String(updateId))
        .limit(1);
      if (dup?.length) {
        return Response.json({ ok: true, skipped: "duplicate" });
      }
    }

    const { error: patientErr } = await (supabaseAdmin as any)
      .from("chat_messages")
      .insert({
        thread_id: thread.id,
        actor_type: "patient",
        message_text: text,
        metadata: {
          tg_update_id: updateId || null,
          tg_message_id: msg.message_id ?? null,
          ...(hasTgAttachment ? { tg_has_attachment: true } : {}),
        },
      });
    if (patientErr) {
      // 유니크 인덱스 충돌(23505) = 동시 배달된 같은 update — 중복이지 실패가 아니다.
      if (patientErr.code === "23505") {
        return Response.json({ ok: true, skipped: "duplicate" });
      }
      console.error("[webhooks/telegram] patient insert:", patientErr.message);
      // 저장 실패는 재시도 가치가 있다 → 비-2xx 로 텔레그램 재전송 유도(위 멱등 가드가 중복을 막음).
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    const alreadyHandedOff = meta.hand_off_requested === true;
    // 코디가 이미 답장 중인 스레드(coordinator_active)도 AI 침묵 대상(독립 리뷰 M1).
    const coordinatorActive = meta.coordinator_active === true;
    const handOff = detectHandOff(text);

    // 스레드 갱신은 요청 안에서 끝낸다(독립 리뷰 C2: after() 에서 낡은 스냅샷으로 metadata
    // 전체를 덮어쓰면 그 사이 끼어든 갱신을 롤백시킴). 필요 없으면 metadata 는 안 건드림.
    // 핸드오프 후 첫 추가 메시지에는 1회 수신 확인(ack)을 보낸다(사전질문 답이 죽은 침묵으로
    // 떨어지는 것 방지 — 2026-07-24 PO). ack 클레임은 조건부 UPDATE 로 병렬 배달을 직렬화
    // (동의 더블탭 F1 과 동일 패턴). 핸드오프 마킹과 한 UPDATE 로 합쳐 서로 덮지 않게 한다.
    // == null(키 없음·null만): 아래 조건부 UPDATE 의 .is(null) 필터와 판정을 일치시킨다
    // (독립 리뷰 PLAUSIBLE — false 로 저장되는 날이 오면 둘이 어긋나 침묵+타임스탬프 유실).
    const wantAck =
      alreadyHandedOff && !coordinatorActive && meta.hand_off_ack_sent == null;
    const metaPatch =
      handOff.requested || wantAck
        ? {
            ...meta,
            ...(handOff.requested
              ? {
                  hand_off_requested: true,
                  hand_off_reason: meta.hand_off_reason || handOff.reason,
                  hand_off_at: meta.hand_off_at || new Date().toISOString(),
                  hand_off_notified: true,
                }
              : {}),
            ...(wantAck ? { hand_off_ack_sent: true } : {}),
          }
        : null;
    let threadUpd = (supabaseAdmin as any)
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        ...(metaPatch ? { metadata: metaPatch } : {}),
      })
      .eq("id", thread.id);
    if (wantAck) {
      threadUpd = threadUpd.is("metadata->>hand_off_ack_sent", null).select("id");
    }
    const { data: ackClaim, error: threadUpdErr } = await threadUpd;
    const sendHandoffAck = wantAck && !!ackClaim?.length;
    if (threadUpdErr) {
      console.error("[webhooks/telegram] thread update:", threadUpdErr.message);
    }

    // 응답을 먼저 닫고(텔레그램 타임아웃·재전송 방지) LLM·발신은 after 로.
    after(async () => {
      try {
        // 스태프 그룹 릴레이(B안) — 환자 메시지를 코디 텔레그램 주제로(설정 안 됐으면 내부 스킵).
        await relayToStaffTopic(thread, "🧑 환자", text);

        // 핸드오프 종은 스레드당 1회(도배 방지 — 웹 message 라우트와 동일 규칙).
        // 핸드오프 종은 스레드당 1회(도배 방지). notified 플래그는 위 동기 갱신에서 기록됨 —
        // after() 에서는 metadata 를 다시 쓰지 않는다(낡은 스냅샷 덮어쓰기 금지, 독립 리뷰 C2).
        if (handOff.requested && !meta.hand_off_notified) {
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: handOff.reason });
          } catch (e: any) {
            console.warn("[webhooks/telegram] handoff bell 실패(무시):", e?.message);
          }
          await relayToStaffTopic(thread, "🙋 시스템", "상담원 연결 요청 — 이 주제에 답장을 쓰면 환자에게 그대로 전달됩니다.");
        }

        // 코디 인수 후 AI 침묵 — 핸드오프된 스레드 + 코디가 답장 중인 스레드 모두.
        // 단, 핸드오프 후 첫 추가 메시지엔 고정 수신확인 1회(AI 재개입 아님 — dead-air 방지).
        if (alreadyHandedOff || coordinatorActive) {
          if (sendHandoffAck) {
            await sendTelegramPatientMessage(chatId, pickTgText(HANDOFF_RECEIVED_ACK, lang));
          }
          return;
        }

        // AI 비용 가드(일일·전역) — 초과 시 침묵하면 텔레그램에선 dead-air(환자 방치)가 되므로
        // (독립 리뷰 M2) 고정 안내 + 코디 종으로 사람 인수를 유도한다.
        const aiGuard = await checkAiGuards(`tg:${chatId}`, "/api/webhooks/telegram");
        if (!aiGuard.allowed) {
          await sendTelegramPatientMessage(chatId, pickTgText(TG_APOLOGY, lang));
          try {
            const { notifyStaffChatHandoff } = await import("@/lib/notifications/inApp");
            await notifyStaffChatHandoff({ threadId: thread.id, reason: "ai_guard_blocked" });
          } catch (e: any) {
            console.warn("[webhooks/telegram] aiGuard bell 실패(무시):", e?.message);
          }
          return;
        }

        // 최근 30개(웹의 '오래된 30개' 버그를 복제하지 않음 — 독립 리뷰 M5). 모델 맥락과
        // 3턴 카운트 모두 최신 창 기준.
        const { data: historyDesc } = await (supabaseAdmin as any)
          .from("chat_messages")
          .select("actor_type, message_text, metadata")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(30);
        const history = (historyDesc || []).slice().reverse();

        const r = await generateChatReply(toModelHistory(history), text, lang, thread.id, {
          isLoggedIn: false,
          // 텔레그램엔 브라우저도 쿠키도 없다 → 「30일 쿠키 재개」를 사실로 말하면 거짓말이고,
          // 그 거짓말이 품질 판사에게 「사실」로 넘어가 환각 검출까지 통과한다(반성문 #179 리뷰 지적).
          channel: "messenger" as const,
          // 텔레그램은 이 창으로 항상 회신 가능 → "연락처 남겨달라" 거짓 게이트 방지.
          hasReachableContact: true,
          // 이 채팅 자체가 연락 채널 → 모델이 연락처·선호 채널을 되묻지 않게(실기기 2026-07-23 PO).
          contactInThisChannel: true,
          // 이번 턴 또는 과거에 첨부가 있던 스레드 → "파일 못 읽음" 하드룰(첨부 환각 방지).
          hasAttachments: hasTgAttachment || history.some((m: any) => m?.metadata?.tg_has_attachment),
        });

        let finalReply = r.reply || "";
        if (handOff.requested) {
          finalReply = `${finalReply ? finalReply + "\n\n" : ""}${pickHandoffConfirm(lang, true, true)}`;
        }
        // 사진·문서를 함께 보낸 턴에는 "파일은 못 받는다" 정직 안내를 덧붙임(캡션 질문엔 답하되).
        if (hasTgAttachment) {
          finalReply = `${finalReply ? finalReply + "\n\n" : ""}${pickTgText(FILE_GUIDE, lang)}`;
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
        await relayToStaffTopic(thread, "🤖 AI", finalReply);

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
              ...(delivered ? {} : { delivery: "failed" }),
            },
          })
          .select("id")
          .single();
        if (aiInsertErr) {
          console.error("[webhooks/telegram] system insert:", aiInsertErr.message);
        }

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

        // 문의 승격: ①사람 연결 요청 턴엔 즉시(1~2턴째 요청이면 이후 AI 침묵 때문에 3턴
        // 규칙에 영영 안 걸려 "접수됐어요"가 거짓이 되던 구멍 — 2026-07-24 실측) ②그 외엔
        // 3턴마다 — 웹 챗과 동일 주기(잡담뿐이면 게이트가 승격만 보류, intakeGate.ts).
        const patientMsgCount = history.filter((m: any) => m.actor_type === "patient").length;
        const intakeDue = patientMsgCount > 0 && patientMsgCount % INTAKE_EVERY_N_TURNS === 0;
        if (handOff.requested || intakeDue) {
          try {
            await createDraftIntake(thread, history as any, lang, null, {
              handOffRequested: handOff.requested,
            });
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
