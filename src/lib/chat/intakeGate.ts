/**
 * healwith: 문의(inquiries) 승격 게이트 — 순수 로직(server-only 아님 → 단위테스트 가능).
 *
 * 왜: "환자 메시지 3턴" 규칙만으로는 잡담("안녕?"×3)도 KHIDI 집계 문의로 등록됐다
 * (2026-07-23 실측: 텔레그램 스레드가 3턴째 "안녕?"에서 inquiry 로 승격 — PO가 무기준
 * 전환으로 인지). 승격은 ①사람 연결·정식 접수 요청(핸드오프) 또는 ②의미 신호(증상 부위·
 * 일정·예산 등 추출 필드 1개 이상)가 있을 때만. 게이트에 걸려도 초안(normalized_inquiries)과
 * chat_threads 는 그대로 남아 코디 화면에서 계속 보인다 — 놓치는 데이터는 없다.
 */

// createEmptyIntake 스키마 중 "대화에 알맹이가 있었다"를 뜻하는 추출 필드들.
// chief_complaint 는 원문 전체 복사라 신호가 아니다(잡담도 채워짐).
const SIGNAL_FIELDS = [
  "body_part",
  "timeline",
  "budget",
  "duration",
  "severity",
  "contraindications",
  "allergy_flag",
  "medications_flag",
] as const;

// 언어 불문 최소 분량(공백·구두점 제외) — "안녕?"×3(6자)·"hi hello"(7자)는 걸리고,
// "Хочу лечить рак"(13자) 같은 짧은 실상담은 통과하게 낮게 잡는다. 놓친 리드(집계 누락)가
// 잡문의 1건보다 훨씬 비싸므로 승격 쪽으로 기운 문턱.
const MIN_MEANINGFUL_CHARS = 12;

export function shouldPromoteToInquiry(
  intake: any,
  handOffRequested: boolean,
  patientTexts = ""
): boolean {
  if (handOffRequested) return true;
  const hasSignal = SIGNAL_FIELDS.some((f) => {
    const v = intake?.[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== false && v !== "";
  });
  if (hasSignal) return true;
  // 추출기(intakeExtract.ts)는 영어 키워드 전용이라 러·한·중·일·카 실상담이 신호 0으로
  // 나온다(독립 리뷰 CONFIRMED — 핵심 타겟이 러시아어인데 신호만 믿으면 리드가 통째로
  // 증발). 언어 불문 폴백: 환자 원문이 최소 분량 이상이면 실상담으로 보고 승격한다.
  // ponytail: 진짜 해법은 6개 언어 추출 키워드(암종·부위·일정) — 지표 품질이 문제되면 확장.
  const stripped = String(patientTexts || "").replace(/[\s\p{P}\p{S}]/gu, "");
  return stripped.length >= MIN_MEANINGFUL_CHARS;
}
