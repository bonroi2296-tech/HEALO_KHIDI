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

// 로그인·세션·저장·계정 관련 "제품 상태 질문"은 화제 정정이 아니다. 모델(시스템 프롬프트의
// SESSION & IDENTITY FACTS)이 정직하게 답해야 함. 이 예외가 없으면 "로그인 안 했는데 저장돼?"의
// '안 했'/"세션 유지 안될텐데"가 정정 패턴에 오탐돼 엉뚱한 사과로 빠짐 (2026-06-22 라이브 재현).
const SESSION_STATE_TERMS =
  /로그인|로그아웃|세션|계정|가입|저장|사라(?:지|져|질)|날아가|남아\s*있|복구|유지\s*(?:안|되|돼|될|할)|log\s*?(?:in|ged|out)|sign(?:ed)?\s*[- ]?in|session|account|save[ds]?|saving|stored|persist|войти|вход|сохран|сесси|аккаунт|登录|账户|保存|セッション|ログイン|アカウント/i;

export function isTopicCorrection(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  // 제품 상태(로그인·세션·저장) 질문이면 정정 단축경로를 타지 않고 모델로 보낸다.
  if (SESSION_STATE_TERMS.test(t)) return false;
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

// ── 인테이크 서류 목록 주입 게이트 (2026-07-04, 루프 전수평가 발견) ──────────
// 왜: careReference(필수서류 5종)가 매 턴 주입되니, "엄마가 폐암인데 저 혼자예요" 같은
// 감정적 첫 메시지에도 모델이 서류 5종을 나열함(ru·kz에서 프롬프트 규칙만으론 안 꺾임 —
// 배포 후 재평가 실측). 해법 = 암종 가드와 같은 패턴: 사용자가 서류·준비물·절차·비용을
// 실제로 물을 때만 목록을 주입하고, 아니면 목록 없는 참고자료 + 나열 금지 가드를 주입.
// (docs-consistency 케이스 = "서류 뭐 필요?"를 물으면 항상 5종 전부 — 키워드에 걸려 유지됨.)
const DOCS_OR_PROCESS_TERMS = new RegExp(
  [
    // ko: 서류·준비·필요한 것·절차·견적·비용
    "서류|준비물|준비해|준비하|무엇을\\s*준비|뭘\\s*준비|필요한\\s*(?:서류|것|게)|절차|견적|가격|비용|얼마",
    // en
    "document|paper(?:s|work)|prepare|what\\s+do\\s+i\\s+need|checklist|procedure|process|price|cost|estimate|quote|how\\s+much",
    // ru
    "документ|справк|выписк|подготов|что\\s+нужно|что\\s+прислать|процедур|стоимост|цен[аыу]|сколько|смет",
    // kz
    "құжат|дайынд|не\\s+керек|қандай\\s+қағаз|баға|құны|қанша",
    // zh
    "资料|文件|材料|准备|需要什么|流程|手续|多少钱|费用|价格|报价",
    // ja
    "書類|資料|準備|必要な|手続き|流れ|費用|料金|いくら|見積",
  ].join("|"),
  "i"
);

/** 사용자가 서류/준비물/절차/비용을 실제로 묻고 있는가 — true 면 서류 목록 주입 허용. */
export function asksDocsOrProcess(text: string): boolean {
  return DOCS_OR_PROCESS_TERMS.test(text || "");
}


// ── 병원 의도 감지 (2026-07-04, 루프 전수평가 발견) ─────────────────────────
// 왜: 기존 인라인 감지(병원|clinic|hospital)가 한국어·영어 전용이라, 러·카·중·일 병원
// 질문엔 STRICT HOSPITAL QUERY RULES(랭킹 금지 등) 가드가 아예 안 켜졌음 — kz
// "제일 싼 병원(арзан аурухана)" 질문에 가격 쇼핑목록이 나온 실측 결함의 근본 원인.
// kz "аурухана"는 격변화 시 어간이 "аурухан-"(ауруханы·ауруханаға 등)이라 어간으로 매칭.
const HOSPITAL_TERMS =
  /병원|의원|한방병원|클리닉|clinic|hospital|больниц|клиник|госпитал|аурухан|емхана|дәрігерлік\s*орталық|医院|诊所|病院|クリニック/i;

/** 현재 메시지가 병원(기관)을 언급/문의하는가 — 6개 언어. */
export function mentionsHospital(text: string): boolean {
  return HOSPITAL_TERMS.test(text || "");
}
