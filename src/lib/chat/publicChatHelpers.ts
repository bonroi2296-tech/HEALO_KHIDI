/**
 * healwith: 공개 챗 라우트 공용 헬퍼
 *
 * /api/public/chat/message (비스트리밍) 와 /api/public/chat/stream (스트리밍) 이 공유.
 * 첨부 검증·접수확인 멘트·핸드오프 멘트·문의서 초안 생성을 한곳에서 관리(드리프트 방지).
 */

import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { getModelName } from "@/lib/chat/generateReply";
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
import { encryptStringNullable, decryptMaybe } from "@/lib/security/encryptionV2";
import { detectInquiryIsTest } from "@/lib/khidi/testData";
import { shouldPromoteToInquiry } from "@/lib/chat/intakeGate";
// 유입 경로에서 비밀 열쇠를 지우는 규칙은 폼 경로와 «같은 것»을 써야 한 표에서 같이 세어진다.
import { safeLandingPath, safeUtm } from "@/lib/inquiry/arrival";
import { trackingUrl, trackingMessageLine, toTrackingLang } from "@/lib/inquiry/trackingLink";
import { siteUrl } from "@/lib/siteUrl";

export const INTAKE_EVERY_N_TURNS = 3;
export const MAX_ATTACHMENTS = 5;

// 환자가 자료(검사결과지·사진)를 올렸을 때 접수 확인 멘트 (6개 언어).
// ⚠️ AI는 의료자료를 판독/진단하지 않음(의료법·안전규칙) → "접수+의료진 검토"로만 안내.
export const ATTACHMENT_ACK: Record<string, string> = {
  ko: "📎 자료 잘 받았습니다. 안전하게 보관됐고, 의료진·코디네이터가 직접 검토한 뒤 정확히 안내드릴게요. (AI는 검사결과를 판독하지 않습니다.)",
  en: "📎 Got your file — it's safely stored. Our medical team/coordinator will review it personally and follow up. (The AI does not interpret medical results.)",
  ru: "📎 Файл получен и надёжно сохранён. Наш врач/координатор лично изучит его и свяжется с вами. (ИИ не интерпретирует медицинские результаты.)",
  kz: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  kk: "📎 Файл қабылданып, қауіпсіз сақталды. Дәрігер/үйлестіруші оны жеке қарап, хабарласады. (AI медициналық нәтижелерді оқымайды.)",
  zh: "📎 已收到您的文件并安全保存。我们的医疗团队/协调员会亲自查看并与您联系。（AI 不会解读医疗检查结果。）",
  ja: "📎 ファイルを受け取り安全に保管しました。医療チーム・コーディネーターが直接確認しご連絡します。（AIは検査結果を判読しません。）",
};

// 접수(핸드오프) 연락처 게이트 멘트·로직은 순수 모듈로 분리(단위테스트 가능) — 여기선 재노출만.
export {
  HANDOFF_CONFIRM,
  HANDOFF_NEED_CONTACT,
  HANDOFF_RECEIVED_ACK,
  hasReachableContact,
  pickHandoffConfirm,
  stripFalseIntakeConfirm,
} from "./contactGate";

// 클라이언트가 보낸 첨부 목록 검증·정제. 업로드 라우트가 항상 inquiry/ 접두사로
// 저장하므로 그 외 경로는 거부(경로조작·임의참조 차단). 최대 5개.
export function sanitizeAttachments(
  input: unknown
): Array<{ path: string; name: string | null; type: string | null }> {
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

// 3턴+ 진행된 대화를 KHIDI 집계 대상(inquiries)으로 1회 승격.
// 왜: 유치 전환 대시보드(/admin/khidi/conversion)는 inquiries 테이블만 센다. 승격이 없으면
// AI 챗으로 들어온 리드가 평가지표(문의 접수→유치)에 0으로 잡혀 안 보인다.
// (PO 결정 2026-06-29: 대화 3턴+ 면 등록.) 중복방지: chat_threads.inquiry_id 가 비어있을 때만.
/** 유입 주소에서 호스트만. 우리 도메인·빈값·깨진 주소는 «유입 아님»(NULL)으로 본다. */
export function hostOf(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const h = new URL(raw).hostname;
    return h && !h.endsWith("healwith.co.kr") ? h.slice(0, 120) : null;
  } catch {
    return null; // 주소가 아닌 값이 들어온 경우
  }
}

/**
 * 승격해도 되는 스레드인가 — 코디가 «연락할 수단»이 하나라도 있어야 한다.
 *
 * 왜 (2026-09-02 실측): 이름·이메일·전화가 전부 빈 채로 3턴을 넘겨 승격된 문의가
 * 코디 인박스에 「빈칸 줄」로 쌓였다(#274·#275·#280·#286). 넷 다 한국어 「접수해줘」 한 마디였고
 * **진짜 문의였던 적은 0건**이다. 연락 수단이 없으면 응대 자체가 불가능하니 실적 문의가 못 된다.
 *
 * is_test 로 덮지 않고 «승격을 미루는» 이유: 스레드는 살아 있으므로 환자가 이름이나 연락처를
 * 하나라도 주면 다음 턴에 저절로 승격된다. 놓치는 게 아니라 기다리는 것이다.
 *
 * 메신저 봇(텔레그램·왓츠앱)은 대화창 자체가 연락 수단이라 제외한다.
 */
export function threadHasContactPoint(thread: any): boolean {
  if (thread?.channel === "telegram" || thread?.channel === "whatsapp") return true;
  return Boolean(thread?.guest_name || thread?.guest_email || thread?.guest_phone);
}

async function promoteThreadToInquiry(
  thread: any,
  intake: any,
  rawEnc: string | null,
  lang: string,
  clientIp: string | null = null
) {
  if (thread?.inquiry_id) return; // 이미 승격됨
  if (!threadHasContactPoint(thread)) return; // 연락 수단이 생길 때까지 대기

  // 테스트/실적 분리(PR #501): 폼 경로(step1·create)와 동일하게 '생성 시점' 판정.
  // 이 경로만 판정이 빠져 내부 테스트 대화가 KHIDI 실적 문의로 집계되던 구멍(2026-07-02 전수 감사).
  // 이메일은 암호화 저장이라 복호화 후 도메인 검사(옛 평문 행은 decryptMaybe 가 그대로 반환).
  let guestEmailPlain: string | null = null;
  try {
    guestEmailPlain = decryptMaybe(thread?.guest_email || null);
  } catch {
    /* 손상 payload 는 판정에서 무시 */
  }
  // 텔레그램 봇 경로는 IP·이메일이 없어 detectInquiryIsTest 가 항상 false — 스레드에 찍힌
  // 테스트 표식(딥링크 ?start=test)을 우선 반영해 KHIDI 실적 오염을 막는다.
  const isTest =
    thread?.metadata?.is_test === true ||
    detectInquiryIsTest({ ip: clientIp, email: guestEmailPlain });

  // PIPA 동의 보존: AI 챗은 chat/start 와 매 메시지에서 동의(health_crossborder)를
  // 강제하므로 3턴+ 도달한 thread 는 동의가 반드시 있다(thread.metadata.consent).
  // 폼(web) 경로처럼 inquiry.intake.consents 에 동의 증빙을 남긴다(법적 기록).
  // 메신저 봇 스레드(텔레그램·왓츠앱)는 동의를 봇 버튼으로 받았음을 출처(consent_source)로 구분.
  const isTelegram = thread?.channel === "telegram";
  const isWhatsApp = thread?.channel === "whatsapp";

  // 유입 기록 — 스레드가 «이미 갖고 있던» 값을 문의로 옮긴다.
  // 왜 필요: 실적 문의의 절반 이상(2026-08-03 실측 31건 중 17건 = 55%)이 이 경로로 들어오는데,
  // 여태 문의 쪽엔 아무것도 안 남아 「유입별」 집계가 절반도 못 보여줬다. 채팅 시작(public/chat/start)이
  // metadata 에 language·landing_path·referrer·utm 을 이미 저장하고 있었다 — 옮기지 않았을 뿐이다.
  // 메신저 봇(텔레그램·왓츠앱)은 웹 화면을 거치지 않아 값이 없다 → NULL. source 로 이미 구분된다.
  const meta = thread?.metadata || {};
  const arrival = isTelegram || isWhatsApp ? {} : {
    source_locale: typeof meta.language === "string" ? meta.language.slice(0, 10) : null,
    // 주소 전체가 아니라 «호스트»만 남긴다(뒤에 검색어·식별자가 붙어 오는 경로가 있다).
    // 폼 경로(step1)와 같은 형태여야 한 표에서 같이 세어진다.
    referrer_host: hostOf(meta.referrer),
    landing_path: safeLandingPath(meta.landing_path),
    utm: safeUtm(meta.utm),
  };
  const tc = thread?.metadata?.consent || null;
  const consentFields = tc
    ? {
        consent_source: isTelegram ? "telegram_bot" : isWhatsApp ? "whatsapp_bot" : "ai_chat",
        consents: { ai_chat_health_crossborder: tc.health_crossborder === true },
        consent_version: tc.version || null,
        consent_at: tc.at || null,
      }
    : {};

  const { data, error } = await (supabaseAdmin as any)
    .from("inquiries")
    .insert({
      // chat_threads 의 게스트 PII 는 같은 방식(encryptStringNullable)으로 암호화돼 있어 그대로 복사(재암호화 불필요).
      first_name: thread.guest_name || null,
      email: thread.guest_email || null,
      contact_id: thread.guest_phone || null,
      nationality: thread.guest_country || null,
      spoken_language: lang,
      treatment_type: intake?.body_part || "general_inquiry",
      message: rawEnc,
      intake: { ...(intake || {}), ...consentFields },
      // KHIDI 채널별 집계(conversion bySource)의 기준값 — 메신저 봇 상담을 채널별로 센다.
      source: isTelegram ? "messenger_telegram" : isWhatsApp ? "messenger_whatsapp" : "ai_agent",
      ...arrival,
      status: "received",
      // 케이스 단계를 여기서 박는다. 전에는 비워둬서 이 경로로 들어온 문의는 환자·에이전시가
      // 보는 진행상황이 통째로 백지였다(2026-08-03). 폼·에이전시 의뢰 경로와 같은 시작점.
      case_status: "intake",
      is_test: isTest,
    })
    .select("id, public_token")
    .single();

  if (error) {
    console.error("[promoteThreadToInquiry] insert:", error.message);
    return;
  }
  if (data?.id) {
    // 경쟁 방지: 아직 null 일 때만 연결(동시 요청이 두 inquiry 를 만들어도 스레드는 하나만 가리킴).
    // ponytail: 드문 경쟁 시 고아 inquiry 1개 가능 — 빈도 낮아 허용, 문제되면 thread당 advisory lock.
    await (supabaseAdmin as any)
      .from("chat_threads")
      .update({ inquiry_id: data.id })
      .eq("id", thread.id)
      .is("inquiry_id", null);

    // 진행상황 타임라인의 첫 줄. 없으면 화면에 「지나온 기록」이 안 그려진다.
    await (supabaseAdmin as any)
      .from("case_status_history")
      .insert({ inquiry_id: data.id, status: "intake", note: "메신저 상담에서 접수" })
      .then(undefined, () => { /* 이력 실패는 무시 — 접수 자체는 성공 */ });

    // 접수되면 «들어온 그 채널로» 진행상황 주소를 돌려준다(PO 결정 2026-08-03).
    // 메신저로 온 사람은 이메일이 없을 수 있어 이 채널이 유일한 통로다. 실패해도 접수는 성공.
    await sendTrackingLinkToMessenger(thread, data.public_token, lang);
  }
}

/**
 * 왓츠앱·텔레그램 대화창에 진행상황 주소 한 줄. 웹 채팅(ai_agent)은 대상이 아니다 —
 * 그 사람은 완료 화면과 확인 메일로 이미 받는다.
 *
 * 보낸 내용은 chat_messages 에도 남긴다. 안 남기면 코디 화면이 「환자가 실제로 본 대화」와
 * 어긋난다(코디는 우리가 뭘 보냈는지 모른 채 응대하게 된다).
 */
async function sendTrackingLinkToMessenger(thread: any, publicToken: string | null, lang: string) {
  if (!publicToken) return;
  if (thread?.channel !== "telegram" && thread?.channel !== "whatsapp") return;

  try {
    const url = trackingUrl(siteUrl(), publicToken, lang);
    const text = trackingMessageLine(url, toTrackingLang(lang));

    let sent = false;
    if (thread.channel === "telegram") {
      const chatId = thread.metadata?.telegram?.chat_id;
      if (!chatId) return;
      const { sendTelegramPatientMessage } = await import("@/lib/messaging/telegram");
      sent = await sendTelegramPatientMessage(chatId, text);
    } else {
      const waId = thread.metadata?.whatsapp?.wa_id;
      if (!waId) return;
      const { sendWhatsAppPatientMessage } = await import("@/lib/messaging/whatsapp");
      sent = (await sendWhatsAppPatientMessage(waId, text)).sent;
    }

    // actor_type 은 'patient'|'admin'|'system' 만 허용(chat_messages CHECK 제약).
    // 봇이 보낸 줄은 webhook 들과 같이 'system'.
    const { error: msgErr } = await (supabaseAdmin as any).from("chat_messages").insert({
      thread_id: thread.id,
      actor_type: "system",
      message_text: text,
      metadata: { kind: "tracking_link", ...(sent ? {} : { delivery: "failed" }) },
    });
    if (msgErr) console.warn("[promoteThreadToInquiry] 주소 발송 기록 실패:", msgErr.message);
  } catch (e: any) {
    console.warn("[promoteThreadToInquiry] 진행상황 주소 발송 실패(무시):", e?.message);
  }
}

// 3턴마다(+핸드오프 즉시) 대화에서 normalized_inquiries draft 생성 (PII 암호화 저장).
// opts.handOffRequested: 이번 턴에 사람 연결·접수 요청이 감지됐는가 — 핸드오프 턴은
// 호출부의 in-memory thread.metadata 가 낡아(동기 UPDATE 이전 스냅샷) 플래그로 따로 받는다.
export async function createDraftIntake(
  thread: any,
  messages: Array<{ actor_type: string; message_text: string }>,
  lang: string,
  clientIp: string | null = null,
  opts: { handOffRequested?: boolean } = {}
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
  const { contraindications, allergy, medications } =
    contraindicationsAndFlagsFromMessage(patientTexts);
  intake.contraindications = contraindications.length ? contraindications : null;
  intake.allergy_flag = allergy || null;
  intake.medications_flag = medications || null;

  const missing = computeMissingFields(intake);
  const confidence = computeExtractionConfidence(intake, missing);

  const rawEnc = encryptStringNullable(patientTexts.slice(0, 1000));

  // 채널 구분 — 메신저 봇 대화는 source_type 을 분리해 유입경로 분석·집계가 가능하게.
  const sourceType =
    thread?.channel === "telegram"
      ? "messenger_telegram"
      : thread?.channel === "whatsapp"
        ? "messenger_whatsapp"
        : "ai_agent";

  const { data, error } = await (supabaseAdmin as any)
    .from("normalized_inquiries")
    .insert({
      source_type: sourceType,
      language: lang,
      raw_message: rawEnc,
      constraints: {
        intake,
        meta: {
          pipeline_version: "v1_chat_thread",
          source_type: sourceType,
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

  // KHIDI 집계 대상(inquiries)으로 승격 — 잡담만으론 승격하지 않는다(게이트: 핸드오프 요청
  // 또는 의미 신호 1개 이상 — src/lib/chat/intakeGate.ts). 초안·스레드는 위에서 이미 남았다.
  const handOff =
    opts.handOffRequested === true || thread?.metadata?.hand_off_requested === true;
  if (shouldPromoteToInquiry(intake, handOff, patientTexts)) {
    await promoteThreadToInquiry(thread, intake, rawEnc, lang, clientIp);
  }
}
