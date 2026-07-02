/**
 * healwith: 핸드오프(사람연결·정식접수·고위험) 의도 감지 — 순수 로직(server-only 아님 → 단위테스트 가능).
 *
 * 왜 분리: generateReply.ts 는 "server-only"(service_role)라 vitest 에서 import 불가 →
 * 빠른버튼(코디네이터·접수)·자유입력의 의도 판정을 6개 언어 전부에 대해 단위테스트로 고정한다.
 *
 * ⚠️ CJK 워드경계 주의: JS 의 \b 는 \w=[A-Za-z0-9_] 기준이라 한글·일본어·중국어 글자 사이엔
 * 경계가 안 생긴다 → /\b상담사\b/·/\b担当者\b/ 는 항상 false. 그래서 한/일/중/러/카는 \b 없이
 * 부분일치로 둔다(영어만 \b 유지). 과거 한·일 패턴이 \b 를 써서 '코디네이터 연결' 버튼을 눌러도
 * 종이 안 울리던 침묵 실패가 있었음(2026-06-30 적대적 리뷰에서 발견).
 */

const HAND_OFF_PATTERNS = [
  /\b(?:human|real\s*person|agent|coordinator|representative|staff|operator)\b/i,
  // ko — \b 제거(CJK 무효). 부분일치.
  /(?:사람|상담[원사]|직원|담당자|연결)/,
  // ja — \b 제거(CJK·가타카나 무효). 부분일치.
  /(?:人間|担当者|スタッフ|オペレーター)/,
  // ru — 핵심 타겟. 키릴 단어는 \b 가 안 먹으므로 부분일치 허용.
  /(?:координатор|оператор|менеджер|специалист|человек|сотрудник|свяжите|связать)/i,
  // kz — 핵심 타겟.
  /(?:үйлестіруші|оператор|маман|қызметкер|адаммен|байланыстыр)/i,
  // zh — 人工/客服/真人/협조원.
  /(?:协调员|人工|客服|真人|工作人员|转接)/,
];

// 정식 접수·진행 의사 — 환자가 "이제 접수/신청해줘"라고 하면 사람에게 넘김(이미 대화에 다 저장됨)
const REGISTER_PATTERNS = [
  /\b(?:register|sign\s*me\s*up|formal(?:ly|\s*(?:registration|intake|request))?|proceed\s*(?:with|to)?|go\s*ahead|enroll|book\s*(?:a|the|my)\b)/i,
  /(?:접수|정식\s*신청|신청\s*(?:할|하고|해|하겠|드)|등록\s*(?:할|하고|해)|진행\s*(?:해|하고\s*싶|시켜)|예약)/,
  /(?:оформ|заявк|записаться|регистрац|подать)/i,
  /(?:тіркел|өтінім|ресми)/i,
  /(?:正式|登记|报名|申请|预约)/,
  /(?:正式|登録|申し込|予約|手続き)/,
];

const HIGH_RISK_PATTERNS = [
  /\b(?:emergency|urgent|severe\s*pain|chest\s*pain|breathing\s*difficult|suicid|overdose)/i,
  // ko — \b 제거(CJK 무효, 위 헤더 주석과 동일 이유). 부분일치.
  /(?:응급|긴급|극심한|자살|과다복용|호흡곤란|죽고\s*싶)/,
  // ru — 핵심 타겟.
  /(?:экстренн|скорую|срочная\s*помощь|суицид|передозиров|задыха|не\s*могу\s*дышать|покончить\s*с\s*собой|хочу\s*умереть)/i,
  // kz — 핵심 타겟.
  /(?:жедел\s*жәрдем|шұғыл|суицид|өзіме\s*қол|дем\s*ала\s*алма|тыныс\s*тарыл|өлгім\s*кел)/i,
  // zh
  /(?:急救|紧急|自杀|想死|服药过量|呼吸困难|剧痛)/,
  // ja
  /(?:救急|緊急|自殺|死にたい|過剰摂取|呼吸困難|激痛)/,
];

export function detectHandOff(text: string): { requested: boolean; reason: string | null } {
  // 고위험(응급·자살)을 최우선 판정 — "응급이에요, 사람 연결해줘" 같은 문장이
  // user_requested_human 으로 약하게 분류되지 않게.
  for (const p of HIGH_RISK_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "high_risk_detected" };
  }
  for (const p of HAND_OFF_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "user_requested_human" };
  }
  for (const p of REGISTER_PATTERNS) {
    if (p.test(text)) return { requested: true, reason: "user_requested_registration" };
  }
  return { requested: false, reason: null };
}
