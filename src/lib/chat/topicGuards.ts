/**
 * healwith: AI 챗 화제 가드 (순수 함수 — server-only 아님 → 단위테스트로 고정)
 *
 * 왜 (2026-06-21 PO 신고): 같은 채팅에서 "대장암"을 여러 번 물은 뒤 암종 없는 일반 질문/정정을
 * 하면, 모델이 누적된 옛 화제(대장암)를 계속 우김(over-anchoring). 정정("난 대장암 안 물어봤는데")
 * 해도 또 대장암을 안내. 프롬프트 규칙만으론 안 꺾여 → 코드로 강제(검출 + 결정적 응답)한다.
 */

// 현재 메시지가 "특정 암종"을 명시했는지. 명시 안 했으면 시스템 프롬프트에 "암종 언급 금지"를
// 강제 주입. 한국어 "X암"(대장암·갑상선암 등)은 앞에 글자가 붙은 경우만(단독 "암"=암종 아님 제외).
const CANCER_TERMS =
  /(?:[가-힣]{1,5}암)(?![가-힣])|백혈병|림프종|육종|colorectal|colon|rectal|breast|stomach|gastric|lung|liver|hepato|thyroid|pancrea|ovari|uterine|cervical|prostate|kidney|renal|bladder|esophag|leukemia|lymphoma|melanoma|sarcoma|glioma|молочн|желудк|лёгк|кишечник|прямой\s*кишк|щитовид|поджелуд|яичник|предстательн|пищевод|лейкоз|лимфом|меланом|саркома|опухол/i;

export function mentionsCancerType(text: string): boolean {
  return CANCER_TERMS.test(text || "");
}

// 사용자가 "그거 안 물어봤다 / 그게 아니다 / 잘못 안내했다"라고 화제를 부정·정정하거나,
// "또 같은 소리 한다 / 동문서답이다 / 오해했다"라고 반복·헛다리에 반발하는 신호.
// 둘 다 결정적 리셋(사과+재질문)으로 디플렉션 루프를 끊는다.
// 주의: "A 말고 B"(새 화제를 같이 줌)는 제외 — 순수 부정/정정/반발 신호만 잡는다.
//
// 2026-06-22 보강(루프 사고): 긴 스레드에서 모델이 같은 변명을 무한 반복할 때, 환자의 반발
// 문장("게 아니고", "왜 이래", "또 이러네", "오해했어", "헛소리", "동문서답")이 기존 패턴에
// 하나도 안 걸려 리셋이 안 됐음 → 메타 정정·반복 항의 신호를 추가한다.
const TOPIC_CORRECTION_PATTERNS = [
  /안\s*물어|안\s*했|안했는|아니라고|아니야|아니에요|아닌데|그게\s*아니|그런\s*거\s*아니|내가\s*언제|잘못\s*안내|안\s*그랬|왜\s*(?:자꾸|계속|또|이래|그래|이렇)/,
  // 메타 정정·반복 항의(화제어 없이도): "~게 아니고/아니라", "오해", "리마인드", "또 이러/그러",
  // "동문서답/헛소리/딴소리/딴얘기", "같은 (말|소리|답)", "고장/먹통"
  /게\s*아니|오해(?:했|하|야|예)|리마인드|또\s*(?:이러|그러|이래|그래|똑같)|동문서답|헛소리|딴\s*(?:소리|얘기|말)|같은\s*(?:말|소리|답|얘기)\s*(?:만|을|좀)?\s*(?:하|반복|또)|고장|먹통/,
  /\b(?:didn'?t|did\s*not)\s+(?:ask|say|mean)\b|\bnot\s+what\s+i\b|\bnever\s+(?:said|asked)\b|\bthat'?s\s+not\b|\bi\s+never\b|\bstop\s+(?:saying|talking|repeating)\b|\byou\s+(?:misunderstood|keep\s+(?:saying|repeating))\b|\bsame\s+(?:answer|thing|reply)\b|\byou'?re\s+broken\b/i,
  /не\s*спрашива|не\s*проси|это\s*не\s*то|я\s*не\s*говори|не\s*об\s*этом|вы\s*не\s*поняли|одно\s*и\s*то\s*же|повторя/i,
  /сұраған\s*жоқ|айтқан\s*жоқ|олай\s*емес|түсінбеді/i,
  /没问|没有问|没说过|不是问|我没|误解|又重复|同样的/,
  /聞いてな|言ってな|そうじゃな|違います|誤解|繰り返/,
];

export function isTopicCorrection(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  return TOPIC_CORRECTION_PATTERNS.some((p) => p.test(t));
}

// 정정 감지 시 결정적 응답(모델 미경유) — 사과 + 무엇을 원하는지 재질문(화제 리셋).
export const TOPIC_CORRECTION_REPLY: Record<string, string> = {
  ko: "앗, 죄송합니다. 제가 잘못 짚었어요. 말씀하지 않으신 내용을 먼저 안내해 드렸네요. 어떤 도움이 필요하신지 편하게 말씀해 주시겠어요? (예: 특정 암 치료, 비용, 병원, 한국 방문 절차 등)",
  en: "Sorry about that — I misread what you needed. What would you like help with? (e.g. a specific cancer's treatment, costs, hospitals, or how to come to Korea)",
  ru: "Извините, я неправильно понял ваш вопрос. Чем могу помочь? (например: лечение конкретного вида рака, стоимость, больницы или порядок приезда в Корею)",
  kz: "Кешіріңіз, сұрағыңызды дұрыс түсінбедім. Немен көмектесейін? (мысалы: нақты қатерлі ісік емі, бағасы, аурухана немесе Кореяға келу тәртібі)",
  zh: "抱歉，我误解了您的问题。请问需要什么帮助？（例如：某种癌症的治疗、费用、医院或来韩流程）",
  ja: "申し訳ありません、ご質問を取り違えました。どのようなことをお手伝いしましょうか？（例：特定のがんの治療、費用、病院、韓国への受診手順など）",
};

export function correctionReply(lang: string): string {
  const key = lang === "kk" ? "kz" : lang;
  return TOPIC_CORRECTION_REPLY[key] || TOPIC_CORRECTION_REPLY.en;
}
