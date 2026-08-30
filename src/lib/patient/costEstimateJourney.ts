/**
 * cost_estimates 행 → 환자 여정(journeyState)이 보는 모양으로 변환.
 *
 * d8ec353d(#1534) 가 죽은 표(coordinator_responses) 대신 cost_estimates 를 읽게
 * 고치면서 journey/route.ts 안에 인라인으로 두었던 매핑을, 시험 가능하게 여기로 추출.
 * (라우트 파일은 GET 외 임의 export 가 불가해 매핑을 단위시험으로 잠글 수 없었다.)
 *
 * journeyState 가 소비하는 어휘: status = "draft" | "sent" | "accepted" | "rejected" | "expired"
 *                             is_final = 정식 견적서(최종 제안) 여부
 */

/** cost_estimates.status 원본 어휘 (app/api/khidi/cost-estimates/[id]/route.ts VALID_STATUSES 와 동일) */
export type CostEstimateStatus =
  | "auto_range"
  | "formal_requested"
  | "hospital_pending"
  | "draft"
  | "issued"
  | "accepted"
  | "rejected"
  | "expired";

export function mapCostEstimateToJourneyResponse(e: any) {
  return {
    ...e,
    is_final: Boolean(e.quotation_issued_at),
    status: e.patient_accepted_at
      ? "accepted"
      : e.quotation_issued_at
        ? "sent"
        : "draft",
    created_at: e.quotation_issued_at || e.created_at,
  };
}
