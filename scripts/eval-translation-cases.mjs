/**
 * 통역 실패 사례 재현 평가 — 7/10 통화 로그 전수조사(194건)에서 나온 실제 실패 케이스를
 * 새 프롬프트(문맥 전달·존대 규칙·echo 가드)로 재번역해 개선 여부를 눈으로 확인한다.
 *
 * 실행: GOOGLE_GENERATIVE_AI_API_KEY 가 있는 환경에서
 *   node scripts/eval-translation-cases.mjs
 * (선택) TRANSLATE_MODEL=gemini-pro-latest node scripts/eval-translation-cases.mjs
 *
 * 판정은 사람이 한다 — 각 케이스에 '기대 방향'이 적혀 있으니 새 번역이 그쪽인지 보면 됨.
 * 배경: docs/POSTMORTEMS.md 및 PR (화상상담 자막·통역 개선) 참고.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const MODEL = process.env.TRANSLATE_MODEL || "gemini-flash-latest";

// translate-realtime/route.ts 의 buildPrompt 와 동일한 규칙 (수동 동기화 — route 수정 시 같이)
function buildPrompt(src, tgt) {
  return `You are a real-time medical interpreter for a telemedicine consultation between a Korean hospital doctor and a foreign patient.
Domain: Korea–CIS medical tourism (oncology). Hospital names, drug/test names, and business terms (e.g. "меморандум"/MOU = 업무협약, agency commission) appear often — treat unfamiliar words as proper nouns, never guess unrelated meanings.

Translate the following ${src} text to ${tgt}.

RULES:
- Translate naturally and accurately, preserving medical terminology
- Use formal/polite register appropriate for doctor-patient communication
- For medical terms, use the standard term in the target language (e.g. "трепан-биопсия" → "트레핀 생검", "второе мнение" → "세컨드 오피니언(2차 소견)")
- When translating into Korean, never address or refer to people as "당신"/"그녀"/"그" — use role terms (환자분, 선생님, 원장님, 대표님) or omit the subject as natural Korean does
- If conversation context is provided, use it to resolve pronouns, omitted subjects, and ambiguous short replies; keep terminology, names, numbers, and the direction of payments/actions consistent with earlier lines
- Keep the translation concise — this is for real-time subtitles
- Omit hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと") from the translation; if the text is ONLY fillers with no content, output nothing at all
- If the input text is already entirely in Korean (mislabeled source), output it unchanged — never "translate" it into broken text
- The input may be a mid-speech fragment cut off by voice detection; translate the fragment faithfully AS-IS — never invent a completion (this is a medical setting; invented content is dangerous)
- Output ONLY the translated text, nothing else — no quotes, no explanations`;
}

// 7/10 세션(a1012a23…) 실제 로그 기반. context 는 당시 직전 발화를 재구성한 것.
const CASES = [
  {
    id: "rn78-수수료-방향",
    text: "На нас будут проценты.",
    context: [
      { speaker: "other", lang: "ko", text: "에이전시가 플랫폼을 통해 환자를 보내주시면 수수료를 드립니다." },
      { speaker: "self", lang: "ru", text: "Мы отправляем пациентов через вашу платформу." },
    ],
    was: "저희에게 수수료가 부과될 것입니다.",
    expect: "'저희가 수수료를 받게 됩니다' 방향 (지급 방향이 문맥과 일치해야 함)",
  },
  {
    id: "rn21-Пожалуйста-다의어",
    text: "Пожалуйста.",
    context: [
      { speaker: "self", lang: "ru", text: "Спасибо большое за информацию." },
      { speaker: "other", lang: "ko", text: "천만에요. 더 궁금한 점 있으신가요?" },
    ],
    was: "부탁드립니다.",
    expect: "'천만에요/별말씀을요' 계열 (감사 답변 문맥)",
  },
  {
    id: "rn143-она-지시체",
    text: "она сейчас села",
    context: [
      { speaker: "self", lang: "ru", text: "У меня телефон почти разрядился, батарея слабая." },
    ],
    was: "그녀가 지금 앉았습니다.",
    expect: "배터리가 방전됐다는 뜻 (직전 문맥의 батарея 를 받아야 함) + '그녀' 금지",
  },
  {
    id: "rn20-조각-완성금지",
    text: "Я бы хотела узнать ваш",
    context: [],
    was: "저는 귀하의 ...을 알고 싶습니다.",
    expect: "조각을 임의 완성하지 않고 그대로 (창작 목적어 금지)",
  },
  {
    id: "rn113-조각-환자지칭",
    text: "А, у него на данный момент",
    context: [
      { speaker: "self", lang: "ru", text: "Расскажу про нашего пациента с раком лёгкого." },
    ],
    was: "아, 현재 환자분은",
    expect: "'환자분' 지칭 유지 + 술어 창작 금지",
  },
  {
    id: "rn94-존대-당신금지",
    text: "И вы тоже будете, как посмотреть на монитор надо.",
    context: [
      { speaker: "self", lang: "ru", text: "Мы покажем результаты обследования на экране." },
    ],
    was: "당신도 모니터를 어떻게 봐야 하는지 보셔야 합니다.",
    expect: "'당신' 금지 — '선생님도 모니터로 함께 보시게 됩니다' 계열",
  },
  {
    id: "rn67-트레핀생검-용어",
    text: "Нужно будет сделать трепан-биопсию.",
    context: [],
    was: "트레판 생검이 필요합니다.",
    expect: "표준 표기 '트레핀 생검'",
  },
  {
    id: "rn73-директор-대표님",
    text: "Наш директор хочет подписать меморандум.",
    context: [
      { speaker: "self", lang: "ru", text: "Мы — агентство медицинского туризма из Казахстана." },
    ],
    was: "저희 원장님이 양해각서에 서명하고 싶어 하십니다.",
    expect: "에이전시 문맥 → '대표님' + 'MOU/업무협약'",
  },
  {
    id: "rn118-она-환자분",
    text: "Это для неё очень важно.",
    context: [
      { speaker: "self", lang: "ru", text: "Наша пациентка ждёт результаты второго мнения." },
    ],
    was: "그녀를 위한 아주 중요한 일입니다.",
    expect: "'그녀' 금지 — '환자분께 아주 중요합니다' 계열",
  },
  {
    id: "echo-한국어입력-ru설정",
    text: "어차피 그 두 역할이 거의 겹치는 거잖아요",
    context: [],
    was: "(러시아어 설정인데 한국어가 들어와 그대로 echo — 오염 기록)",
    expect: "한국어 그대로 출력 (깨진 번역 시도 금지) — echo 가드 확인",
  },
];

function buildContextBlock(context) {
  if (!context.length) return "";
  const lines = context.map((it) => `[${it.speaker}${it.lang ? `, ${it.lang}` : ""}] ${it.text}`);
  return `Recent conversation (oldest first) — for context ONLY, do NOT translate or repeat it:\n${lines.join("\n")}\n\n`;
}

const results = [];
for (const c of CASES) {
  const { text: translated } = await generateText({
    model: google(MODEL),
    system: buildPrompt("Russian", "Korean"),
    prompt: `${buildContextBlock(c.context)}Text to translate:\n${c.text}`,
    temperature: 0.1,
    maxOutputTokens: 500,
  });
  results.push({ ...c, now: translated.trim() });
  console.log(`\n━━ ${c.id}`);
  console.log(`  원문   : ${c.text}`);
  console.log(`  기존   : ${c.was}`);
  console.log(`  신규   : ${translated.trim()}`);
  console.log(`  기대   : ${c.expect}`);
}

console.log(`\n총 ${results.length}건 — 각 '신규'가 '기대' 방향인지 사람이 판정하세요. (모델: ${MODEL})`);
