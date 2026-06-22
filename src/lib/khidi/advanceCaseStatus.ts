import "server-only";
import { caseStatusOrder } from "./caseStatus";

/**
 * 케이스 진행상황(case_status) 전진 + 이력 기록 — 역할 포털 간 '엣지' 공용 헬퍼.
 *
 * 배경(POSTMORTEM #18/#20): 상담 완료·병원 배정·유치 확정 같은 사건이 한 테이블만
 * 바꾸고 case_status / case_status_history 에는 안 남아, 에이전시·코디·환자 타임라인이
 * 정체되던 '반쪽' 패턴이 여러 곳에 있었다. 이 헬퍼로 통일한다.
 *
 * 규칙:
 *  - 단계는 **뒤로 가지 않는다**(caseStatusOrder 가드) — 이미 더 진행된 케이스는 단계 유지.
 *  - 단, 사건 가시성을 위해 **이력(case_status_history)은 항상 한 줄 남긴다**(note 로 의미 전달).
 *    (recordHistory=false 로 끄면 단계만 전진.)
 *  - 베스트에포트: 실패해도 본 작업(상담 저장 등)을 막지 않게 호출부에서 try/catch 권장.
 *
 * @param supabase service_role 클라이언트
 * @param inquiryId inquiries.id
 * @param targetStatus 전진 목표 case_status 키
 * @param note 타임라인 메모(에이전시/코디가 봄)
 * @param userId 행위자(없으면 null=시스템)
 */
export async function advanceCaseStatus(
  supabase: any,
  inquiryId: number | string,
  targetStatus: string,
  note: string,
  userId: string | null = null,
  opts: { recordHistory?: boolean } = {}
): Promise<{ advanced: boolean; from: string | null; to: string | null }> {
  const recordHistory = opts.recordHistory ?? true;

  const { data: inq } = await supabase
    .from("inquiries")
    .select("case_status")
    .eq("id", inquiryId)
    .maybeSingle();
  const cur: string | null = inq?.case_status ?? null;

  const willAdvance = caseStatusOrder(cur) < caseStatusOrder(targetStatus);
  const now = new Date().toISOString();
  const finalStatus = willAdvance ? targetStatus : cur;

  if (willAdvance) {
    await supabase
      .from("inquiries")
      .update({
        case_status: targetStatus,
        case_status_note: note,
        case_status_updated_at: now,
      })
      .eq("id", inquiryId);
  }

  if (recordHistory) {
    await supabase.from("case_status_history").insert({
      inquiry_id: inquiryId,
      status: finalStatus ?? targetStatus,
      note,
      created_by: userId,
    });
  }

  return { advanced: willAdvance, from: cur, to: finalStatus };
}
