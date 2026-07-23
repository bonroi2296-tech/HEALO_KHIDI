/**
 * 실시간 번역 출력 위생 가드 (translate-realtime 전용 순수 함수 — 테스트 격리용 분리)
 *
 * 왜: gemini-flash 가 드물게(실측 ~5-15%, temperature 0.1 에서도) 번역문 대신
 *   (a) 시스템 규칙을 누출("Output ONLY the translated text", "No fillers", "Concise for subtitles"…)
 *   (b) 번역 후보를 나열('…" or "…')
 *   한다. translate-realtime 는 STT 라우트({"t","x","l"} JSON 봉투 → 파싱 실패 시 폐기)와 달리
 *   평문 출력을 그대로 신뢰해, 그 쓰레기가 자막에 뜨고 DB 번역기록·AI 회의록까지 오염됐다(반성문 #109).
 * ⚠️ 프롬프트 규칙("Output ONLY…")만으론 못 막는다 — 모델 확률성은 코드로 강제(#15 부류).
 */

// 러시아어/한국어 정상 번역엔 나타날 이유가 없는 영어 지시문구(시스템 프롬프트 조각).
const LEAK_PHRASES = [
  "output only",
  "no fillers",
  "concise for subtitles",
  "hesitation filler",
  "medical interpreter",
  "translate the following",
  "for real-time subtitles",
  "mislabeled source",
];

/**
 * 번역문이 아니라 규칙 누출/후보 나열/불릿목록이면 true (그 조각은 폐기해야 안전).
 * @param targetLang 도착어. 'en' 이면 (a)영어 규칙문구·(b)따옴표-"or" 대안은 정상 영어 번역에도
 *   나올 수 있어(예: 'chemo' or 'radiation') 제외한다. 그 외(오늘 ru 포함)에선 누출 신호.
 */
export function looksLikeLeakedTranslation(s: string, targetLang?: string): boolean {
  if (!s) return false;
  // (c) 마크다운 불릿(규칙 목록 누출의 흔한 형태) — 어떤 언어의 정상 실시간 자막에도 없다 → 항상 검사.
  if (/(?:^|\n)\s*[*•]\s+\S/.test(s)) return true;
  // 도착어가 영어면 아래 영어-기반 신호는 오탐 위험이 커 건너뛴다(불릿만으로 방어).
  if (targetLang === "en") return false;
  const low = s.toLowerCase();
  // (a) 규칙 누출 — 비영어 자막에 이 영어 지시문구가 섞이면 거의 확실히 누출.
  if (LEAK_PHRASES.some((p) => low.includes(p))) return true;
  // (b) 후보 나열 — 따옴표로 감싼 대안을 "or" 로 이어붙임: …" or "… (실측된 유일한 형태).
  if (/["'”“]\s*or\s*["'”“]/i.test(s)) return true;
  return false;
}
