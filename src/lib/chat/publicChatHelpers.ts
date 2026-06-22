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
import { encryptStringNullable } from "@/lib/security/encryptionV2";

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

// 핸드오프 확인 멘트 (6개 언어) — 연락처(이메일·전화·계정)가 있어 코디가 실제로 연락 가능할 때만.
// "다시 입력 안 해도 됨" 명시. 대화 내용은 이미 서버 저장됨.
export const HANDOFF_CONFIRM: Record<string, string> = {
  ko: "🔔 접수됐어요. 지금까지 말씀해주신 내용은 그대로 저장됐고, healwith 코디네이터가 곧 연락드립니다. 다시 입력하실 필요 없어요.",
  en: "🔔 You're registered. Everything you shared here is saved — a healwith coordinator will reach out shortly. No need to re-enter anything.",
  ru: "🔔 Заявка принята. Всё, что вы рассказали, сохранено — координатор healwith скоро свяжется с вами. Повторно вводить ничего не нужно.",
  kz: "🔔 Өтінім қабылданды. Айтқандарыңыз сақталды — healwith үйлестірушісі жақын арада хабарласады. Қайта енгізудің қажеті жоқ.",
  kk: "🔔 Өтінім қабылданды. Айтқандарыңыз сақталды — healwith үйлестірушісі жақын арада хабарласады. Қайта енгізудің қажеті жоқ.",
  zh: "🔔 已为您登记。您在此提供的信息都已保存，healwith 协调员会尽快与您联系，无需重新填写。",
  ja: "🔔 受付しました。お話しいただいた内容は保存済みです。healwithのコーディネーターからまもなくご連絡します。再入力は不要です。",
};

// 핸드오프 요청인데 연락처(이메일·전화·계정)가 없을 때 — "접수됐다"고 거짓말하지 않고,
// 대화는 저장돼 있음을 안심시키면서 연락 수단 하나만 부탁한다. (2026-06-22 PO 재현 버그 수정)
export const HANDOFF_NEED_CONTACT: Record<string, string> = {
  ko: "🔔 바로 도와드릴게요! 코디네이터가 연락드리려면 이메일이나 메신저 아이디(WhatsApp·Telegram·WeChat·LINE) 하나만 남겨주세요. 지금까지 대화는 이 브라우저에 안전하게 저장돼 있어 사라지지 않아요.",
  en: "🔔 Happy to get you started! To have a coordinator follow up, just leave one contact — an email or a messenger ID (WhatsApp/Telegram/WeChat/LINE). This chat is safely saved on this device, so nothing is lost.",
  ru: "🔔 С радостью помогу! Чтобы координатор связался с вами, оставьте один контакт — эл. почту или мессенджер (WhatsApp/Telegram/WeChat/LINE). Этот чат надёжно сохранён на этом устройстве, ничего не потеряется.",
  kz: "🔔 Қуана көмектесемін! Үйлестіруші хабарласуы үшін бір байланыс қалдырыңыз — email немесе мессенджер (WhatsApp/Telegram/WeChat/LINE). Бұл чат осы құрылғыда сақталған, ештеңе жоғалмайды.",
  kk: "🔔 Қуана көмектесемін! Үйлестіруші хабарласуы үшін бір байланыс қалдырыңыз — email немесе мессенджер (WhatsApp/Telegram/WeChat/LINE). Бұл чат осы құрылғыда сақталған, ештеңе жоғалмайды.",
  zh: "🔔 很乐意为您开始办理！为方便协调员与您联系，请留下一个联系方式——邮箱或即时通讯账号（WhatsApp/Telegram/WeChat/LINE）。本对话已安全保存在此设备上，不会丢失。",
  ja: "🔔 喜んでお手伝いします！コーディネーターからご連絡できるよう、連絡先を一つだけ（メール、またはWhatsApp・Telegram・WeChat・LINEのID）お知らせください。この会話はこの端末に安全に保存されているので消えません。",
};

// 코디네이터가 실제로 연락할 수단이 있는가 — 게스트 이메일/전화(암호화 컬럼은 값이 있으면 non-null)
// 또는 로그인 계정(user_id). 접수 멘트가 "접수완료"인지 "연락처부터"인지를 가른다.
export function hasReachableContact(thread: any): boolean {
  return !!(thread?.guest_email || thread?.guest_phone || thread?.user_id);
}

// 핸드오프 확인 멘트 선택 — 연락 가능하면 접수완료, 아니면 연락처 요청.
export function pickHandoffConfirm(lang: string, reachable: boolean): string {
  const map = reachable ? HANDOFF_CONFIRM : HANDOFF_NEED_CONTACT;
  return map[lang] || map.en;
}

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

// 3턴마다 대화에서 normalized_inquiries draft 생성 (PII 암호화 저장).
export async function createDraftIntake(
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
  const { contraindications, allergy, medications } =
    contraindicationsAndFlagsFromMessage(patientTexts);
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
