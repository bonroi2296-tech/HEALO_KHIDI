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

export function shouldPromoteToInquiry(intake: any, handOffRequested: boolean): boolean {
  if (handOffRequested) return true;
  return SIGNAL_FIELDS.some((f) => {
    const v = intake?.[f];
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== false && v !== "";
  });
}
