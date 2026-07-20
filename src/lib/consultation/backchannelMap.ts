/**
 * 원격협진 맞장구(백채널) 즉시 번역 사전
 *
 * 7/10 통화 로그 전수조사: 발화의 39%가 "네/Да/Угу/좋아요" 류 한두 단어 맞장구였다.
 * 이런 조각까지 매번 Gemini 번역 API 를 부르면 비용·지연만 늘고 오역 여지만 생긴다
 * → 대표 맞장구는 API 호출 없이 정적 사전으로 즉시 자막 처리.
 *
 * 원칙: 의미가 문맥에 따라 갈리지 않는, 사전 대응이 안전한 표현만 담는다.
 * (러시아어 "Пожалуйста" 같은 다의어는 절대 넣지 않는다 — 문맥 필요 → API 로)
 *
 * 사용처: 상담방 translateText() 진입부 — 매칭되면 번역 API 스킵.
 */

const PUNCT_RE = /[.,!?…~\-—–·'"“”‘’()\[\]]+/g;

// 의미 키별 6개 언어 번역 (자막에 내보낼 표준형)
const TRANSLATIONS: Record<string, Record<string, string>> = {
  yes: { ko: "네", en: "Yes", ru: "Да", kz: "Иә", zh: "是", ja: "はい" },
  no: { ko: "아니요", en: "No", ru: "Нет", kz: "Жоқ", zh: "不是", ja: "いいえ" },
  okay: { ko: "좋아요", en: "Okay", ru: "Хорошо", kz: "Жақсы", zh: "好的", ja: "いいですよ" },
  understood: { ko: "알겠습니다", en: "Understood", ru: "Понятно", kz: "Түсінікті", zh: "明白了", ja: "わかりました" },
  thanks: { ko: "감사합니다", en: "Thank you", ru: "Спасибо", kz: "Рахмет", zh: "谢谢", ja: "ありがとうございます" },
  hello: { ko: "안녕하세요", en: "Hello", ru: "Здравствуйте", kz: "Сәлеметсіз бе", zh: "您好", ja: "こんにちは" },
};

// 정규화된 발화 → 의미 키
const PHRASE_TO_KEY: Record<string, string> = {
  // yes
  "네": "yes", "예": "yes", "응": "yes", "맞아요": "yes", "맞습니다": "yes",
  "да": "yes", "ага": "yes", "угу": "yes",
  "иә": "yes", "ия": "yes",
  "yes": "yes", "yeah": "yes", "yep": "yes",
  "是": "yes", "对": "yes", "是的": "yes",
  "はい": "yes", "ええ": "yes", "そうです": "yes",
  // no
  "아니요": "no", "아니오": "no", "아니": "no", "아닙니다": "no",
  "нет": "no", "жоқ": "no",
  "no": "no", "nope": "no",
  "不是": "no", "不": "no",
  "いいえ": "no",
  // okay
  "좋아요": "okay", "좋습니다": "okay",
  "хорошо": "okay", "ладно": "okay", "окей": "okay",
  "жақсы": "okay", "мақұл": "okay",
  "ok": "okay", "okay": "okay",
  "好的": "okay", "好": "okay",
  "いいですよ": "okay", "大丈夫です": "okay",
  // understood
  "알겠습니다": "understood", "알겠어요": "understood",
  "понятно": "understood", "ясно": "understood",
  "түсінікті": "understood", "түсіндім": "understood",
  "understood": "understood", "got it": "understood", "i see": "understood",
  "明白了": "understood", "明白": "understood",
  "わかりました": "understood", "了解です": "understood",
  // thanks
  "감사합니다": "thanks", "고맙습니다": "thanks", "감사해요": "thanks",
  "спасибо": "thanks", "рахмет": "thanks", "рақмет": "thanks",
  "thank you": "thanks", "thanks": "thanks",
  "谢谢": "thanks", "谢谢你": "thanks",
  "ありがとうございます": "thanks", "ありがとう": "thanks",
  // hello
  "안녕하세요": "hello",
  "здравствуйте": "hello", "привет": "hello",
  "сәлеметсіз бе": "hello", "сәлем": "hello",
  "hello": "hello", "hi": "hello",
  "你好": "hello", "您好": "hello",
  "こんにちは": "hello",
};

/**
 * 발화 전체가 사전에 있는 맞장구면 targetLang 번역을 반환, 아니면 null(→ 번역 API 로).
 */
export function getBackchannelTranslation(text: string, targetLang: string): string | null {
  if (!text) return null;
  const normalized = text.replace(PUNCT_RE, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized || normalized.length > 20) return null; // 긴 문장은 사전 대상 아님
  const key = PHRASE_TO_KEY[normalized];
  if (!key) return null;
  return TRANSLATIONS[key]?.[targetLang] || null;
}
