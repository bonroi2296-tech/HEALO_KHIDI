import "server-only";

/**
 * healwith: 환자용 텔레그램 봇 — 아웃바운드 어댑터
 *
 * ⚠️ PO 개인 알림봇(src/lib/notifications/telegram.ts, TELEGRAM_BOT_TOKEN)과 별개 봇이다.
 * 이 모듈은 환자와 대화하는 브랜드 봇(TELEGRAM_PATIENT_BOT_TOKEN)으로만 발신한다.
 * 섞으면 환자 답장이 PO 개인 채팅으로 가는 사고 → env 이름부터 분리.
 *
 * 외부 SDK 없음(fetch만) · fail-safe(throw 금지 — 발신 실패가 메인 로직을 죽이지 않게).
 */

import { stripMarkdownForTelegram, splitTelegramText } from "./telegramText";

const TG_API = "https://api.telegram.org";

export { stripMarkdownForTelegram, splitTelegramText };

export function isPatientBotConfigured(): boolean {
  return !!process.env.TELEGRAM_PATIENT_BOT_TOKEN;
}

async function callBotApi(method: string, payload: Record<string, any>): Promise<boolean> {
  const token = process.env.TELEGRAM_PATIENT_BOT_TOKEN;
  if (!token) return false; // 미설정이면 조용히 스킵(거짓 'sent' 안 남김)
  try {
    const res = await fetch(`${TG_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // 응답 본문에 chat_id 등 식별자가 섞일 수 있어 status 만 로그(PII·토큰 노출 금지).
      console.error(`[messaging/telegram] ${method} failed: ${res.status}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[messaging/telegram] ${method} exception:`, e?.message);
    return false;
  }
}

/** 환자에게 텍스트 발신. 분할된 모든 조각이 성공해야 true. */
export async function sendTelegramPatientMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  const parts = splitTelegramText(stripMarkdownForTelegram(text));
  if (!parts.length) return false;
  let allOk = true;
  for (const part of parts) {
    const ok = await callBotApi("sendMessage", {
      chat_id: chatId,
      text: part,
      disable_web_page_preview: true,
    });
    if (!ok) allOk = false;
  }
  return allOk;
}

/** callback_query 응답(버튼 로딩 스피너 해제). */
export async function answerCallbackQuery(callbackQueryId: string): Promise<boolean> {
  return callBotApi("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

/** 인라인 버튼 제거(동의 완료 후 재터치 방지 — 원 메시지의 키보드를 비움). */
export async function removeInlineKeyboard(
  chatId: string | number,
  messageId: number
): Promise<boolean> {
  return callBotApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

// ── PIPA 동의 UX ────────────────────────────────────────────────────────────
// 웹 챗과 동일한 1줄 동의(민감 건강정보 수집 + 국외/AI 이전) — 동의 shape 도 웹과 동일하게
// thread.metadata.consent = { health_crossborder, version, at } 로 기록한다(웹훅 라우트 담당).
// 버전은 챗 동의 현행 버전과 맞춘다(app/inquiry/ThreadChat.jsx "1.0.0").
export const TG_CONSENT_VERSION = "1.0.0";

// 활성 6개 언어(ko·en·ru·kz·zh·ja). 미지원 언어는 en 폴백.
// export: 왓츠앱 봇(whatsapp.ts)이 같은 동의 문구를 재사용한다(채널 중립 카피).
export const CONSENT_PROMPT: Record<string, string> = {
  ko: "안녕하세요, HEALO입니다 🌿 상담을 시작하기 전에 동의가 필요해요.\n\n상담을 위해 입력하시는 개인정보·민감 건강정보를 수집하고, AI 응답 생성을 위해 국외(해외 클라우드·AI)로 이전하는 것에 동의하시나요? 대화는 암호화되어 안전하게 보관됩니다.",
  en: "Hello, this is HEALO 🌿 Before we start, we need your consent.\n\nDo you agree that the personal and sensitive health information you share here is collected and transferred abroad (overseas cloud/AI) to generate responses? Your conversation is encrypted and safely stored.",
  ru: "Здравствуйте, это HEALO 🌿 Прежде чем начать, нам нужно ваше согласие.\n\nВы согласны на сбор персональных и медицинских данных, которые вы сообщите здесь, и их передачу за рубеж (зарубежное облако/ИИ) для формирования ответов? Разговор шифруется и надёжно хранится.",
  kz: "Сәлеметсіз бе, бұл HEALO 🌿 Бастамас бұрын келісіміңіз қажет.\n\nОсында жазатын жеке және денсаулыққа қатысты деректеріңізді жинауға және жауап дайындау үшін шетелге (шетелдік бұлт/AI) жіберуге келісесіз бе? Әңгіме шифрланып, қауіпсіз сақталады.",
  zh: "您好，这里是 HEALO 🌿 在开始咨询前，需要您的同意。\n\n您是否同意我们收集您在此提供的个人及敏感健康信息，并为生成回复而向境外（海外云/AI）传输？对话内容将加密安全保存。",
  ja: "こんにちは、HEALOです 🌿 ご相談を始める前に同意が必要です。\n\nご入力いただく個人情報・健康に関する情報を収集し、回答生成のため国外（海外クラウド・AI）へ移転することに同意いただけますか？会話は暗号化され安全に保管されます。",
};

// 왓츠앱 interactive 버튼 title 은 20자 하드리밋 — 아래 전부 20자 이내(재사용 시 주의).
export const CONSENT_BUTTON: Record<string, string> = {
  ko: "✅ 동의하고 시작",
  en: "✅ Agree & start",
  ru: "✅ Согласен, начать",
  kz: "✅ Келісемін, бастау",
  zh: "✅ 同意并开始",
  ja: "✅ 同意して開始",
};

export const CONSENT_WELCOME: Record<string, string> = {
  ko: "감사합니다! 이제 편하게 물어보세요. 암 치료·병원·비용·한국 방문 절차 등 무엇이든 답해 드릴게요. 사람 상담원과 연결을 원하시면 언제든 말씀해 주세요 🙌",
  en: "Thank you! Ask me anything — cancer treatment options, hospitals, costs, or visiting Korea. If you'd like a human coordinator at any point, just say so 🙌",
  ru: "Спасибо! Задавайте любые вопросы — лечение онкологии, больницы, стоимость, поездка в Корею. Если захотите поговорить с координатором-человеком, просто скажите 🙌",
  kz: "Рақмет! Кез келген сұрақ қойыңыз — қатерлі ісік емі, ауруханалар, құны, Кореяға бару. Адам-үйлестірушімен сөйлескіңіз келсе, айтыңыз 🙌",
  zh: "谢谢！请随时提问——癌症治疗方案、医院、费用、来韩流程等。如需人工协调员，随时告诉我 🙌",
  ja: "ありがとうございます！がん治療・病院・費用・訪韓手続きなど、何でもご質問ください。人間のコーディネーターをご希望の際はいつでもお知らせください 🙌",
};

// 재입장 /start 한 줄 인사 — 동의·환영을 이미 마친 사용자가 딥링크로 다시 들어올 때.
// 전체 환영문(CONSENT_WELCOME) 반복은 실기기에서 소음으로 확인(2026-07-23 PO 지적).
export const TG_WELCOME_BACK: Record<string, string> = {
  ko: "다시 오셨네요! 이어서 편하게 말씀해 주세요 🙌",
  en: "Welcome back! Feel free to continue anytime 🙌",
  ru: "С возвращением! Продолжайте, когда вам удобно 🙌",
  kz: "Қайта келгеніңізге қуаныштымыз! Жалғастыра беріңіз 🙌",
  zh: "欢迎回来！随时继续咨询 🙌",
  ja: "おかえりなさい！引き続きお気軽にどうぞ 🙌",
};

// AI 생성 실패 시 고정 사과문 — err.message 원문을 환자에게 회신 금지(CLAUDE.md 보안규칙).
export const TG_APOLOGY: Record<string, string> = {
  ko: "죄송합니다, 지금 답변을 만들지 못했어요. 잠시 후 다시 보내 주시면 꼭 답해 드릴게요.",
  en: "Sorry — I couldn't generate a reply just now. Please try again in a moment.",
  ru: "Извините, сейчас не удалось сформировать ответ. Пожалуйста, повторите чуть позже.",
  kz: "Кешіріңіз, дәл қазір жауап дайындалмады. Сәл кейін қайта жазып көріңіз.",
  zh: "抱歉，刚才未能生成回复。请稍后再试。",
  ja: "申し訳ありません、ただいま回答を作成できませんでした。少し後にもう一度お送りください。",
};

export function pickTgText(map: Record<string, string>, lang: string): string {
  return map[lang] || map.en;
}

/** 동의 요청 메시지 + 인라인 동의 버튼 발신. */
export async function sendConsentPrompt(chatId: string | number, lang: string): Promise<boolean> {
  return callBotApi("sendMessage", {
    chat_id: chatId,
    text: pickTgText(CONSENT_PROMPT, lang),
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: pickTgText(CONSENT_BUTTON, lang), callback_data: `consent:${TG_CONSENT_VERSION}` }],
      ],
    },
  });
}
