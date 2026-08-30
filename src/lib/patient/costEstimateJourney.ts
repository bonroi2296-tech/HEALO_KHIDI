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

/**
 * 매핑 규칙 — 원본 status 우선, 타임스탬프는 보강 신호로만 (2026-08-30, #1534 후속).
 *
 * 이전 판은 타임스탬프만 봐서(quotation_issued_at ⇒ sent·최종) 환자가 «거절»한 견적도
 * 「발송됨·최종제안」으로 둔갑 → 여정이 visa 로 전진하고 알림 배지가 영구히 남았다.
 *
 *   accepted (또는 patient_accepted_at)  → "accepted" · 최종
 *   rejected                             → "rejected" · 최종 아님 (환자가 거절 — 제안 검토로 회귀)
 *   expired  + 발행 이력 있음            → "expired"  · 최종 아님
 *   expired  + 발행 이력 없음            → "draft"    (환자에게 보인 적 자체가 없다)
 *   issued   (또는 quotation_issued_at)  → "sent"     · 최종 — PATCH 로 issued 만 바뀐 건도
 *            발송으로 친다([id]/route.ts 가 환자에게 「견적 준비됨」 알림까지 보내는 경로)
 *   그 외(auto_range/formal_requested/hospital_pending/draft) → "draft" — 아직 보낸 제안 아님
 *
 * 불변식(시험이 잠금): is_final === (status ∈ {sent, accepted}).
 */
export function mapCostEstimateToJourneyResponse(e: any) {
  const src = String(e?.status || "");
  const status =
    src === "accepted" || e.patient_accepted_at
      ? "accepted"
      : src === "rejected"
        ? "rejected"
        : src === "expired"
          ? e.quotation_issued_at
            ? "expired"
            : "draft"
          : src === "issued" || e.quotation_issued_at
            ? "sent"
            : "draft";
  return {
    ...e,
    is_final: status === "sent" || status === "accepted",
    status,
    created_at: e.quotation_issued_at || e.created_at,
  };
}
