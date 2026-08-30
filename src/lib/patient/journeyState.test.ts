import { describe, it, expect, vi } from "vitest";

// journeyState.js 는 브라우저 Supabase 클라이언트를 import 한다(순수함수 테스트엔 불필요).
// node 환경에서 import 부작용을 막기 위해 mock 으로 대체.
vi.mock("../supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({}),
}));

import {
  computeCurrentStage,
  computeNextActions,
  computeNotificationCount,
} from "./journeyState.js";
import { mapCostEstimateToJourneyResponse } from "./costEstimateJourney";

/**
 * EDGE-1 회귀잠금 (2026-06-22): 코디/병원이 올린 inquiry.case_status 가
 * 환자 여정바 단계에 반영되는지 + 진행이 뒤로 가지 않는지.
 */
describe("computeCurrentStage — case_status 반영(EDGE-1)", () => {
  it("이벤트가 없어도 case_status 가 단계를 전진시킨다", () => {
    const data = {
      consultations: [],
      coordinatorResponses: [],
      followup: null,
      events: [],
      inquiry: { id: 1, case_status: "preparation" },
    };
    // 이벤트 기반이면 'inquiry' 에 머물지만, case_status=preparation → 'visa'
    expect(computeCurrentStage(data)).toBe("visa");
  });

  it("코디가 treatment 로 올리면 환자 여정도 treatment", () => {
    const data = {
      consultations: [],
      coordinatorResponses: [],
      followup: null,
      events: [],
      inquiry: { id: 1, case_status: "treatment" },
    };
    expect(computeCurrentStage(data)).toBe("treatment");
  });

  it("진행 후퇴 방지 — 이벤트가 더 앞서면 case_status 가 끌어내리지 않는다", () => {
    const data = {
      consultations: [],
      coordinatorResponses: [],
      followup: { id: 9 }, // → recovery (가장 앞 단계)
      events: [],
      inquiry: { id: 1, case_status: "consultation" }, // consultation (뒤 단계)
    };
    // recovery(7) > consultation(2) → recovery 유지
    expect(computeCurrentStage(data)).toBe("recovery");
  });

  it("보류(on_hold)는 단계를 바꾸지 않고 기존 계산을 유지", () => {
    const data = {
      consultations: [{ status: "scheduled" }],
      coordinatorResponses: [],
      followup: null,
      events: [],
      inquiry: { id: 1, case_status: "on_hold" },
    };
    // on_hold 는 매핑 없음 → 기존(예정 상담)=consultation
    expect(computeCurrentStage(data)).toBe("consultation");
  });

  it("case_status 없으면 기존 이벤트 기반 계산 그대로", () => {
    const data = {
      consultations: [],
      coordinatorResponses: [{ is_final: true }],
      followup: null,
      events: [],
      inquiry: { id: 1, case_status: null },
    };
    expect(computeCurrentStage(data)).toBe("visa");
  });

  it("데이터 없으면 inquiry", () => {
    expect(computeCurrentStage(null)).toBe("inquiry");
  });
});

/**
 * 회귀잠금 (2026-08-30, d8ec353d/#1534 후속): cost_estimates → 여정 매핑.
 *
 * #1534 는 죽은 표 대신 cost_estimates 를 읽게 했지만, 매핑이 원본 status 를 안 보고
 * 타임스탬프만 봐서 ①거절(rejected)·만료(expired)된 견적이 「발송됨·최종제안」으로 둔갑해
 * 여정이 visa 로 전진 + 알림 배지가 영구히 남았고, ②journeyState 의 newProposals
 * (`sent && !is_final`) 가 논리적으로 도달 불가능했으며, ③환자에게 보낸 적 없는
 * draft 계열 행만 있어도 hasAnyProposal 이 여정을 proposal 로 전진시켰다.
 */
const T_ISSUED = "2026-08-20T10:00:00.000Z";
const T_ACCEPTED = "2026-08-21T10:00:00.000Z";
const T_CREATED = "2026-08-19T10:00:00.000Z";

/** cost_estimates 행 모형 — 실제 라이프사이클 기준 타임스탬프 */
const estimateRow = (status: string, overrides: Record<string, unknown> = {}) => ({
  id: `est-${status}`,
  status,
  created_at: T_CREATED,
  quotation_issued_at: null,
  patient_accepted_at: null,
  ...overrides,
});

const baseJourney = (coordinatorResponses: unknown[]) => ({
  consultations: [],
  coordinatorResponses,
  followup: null,
  events: [],
  inquiry: { id: 1, case_status: null },
  threads: [],
  symptoms: [],
});

describe("mapCostEstimateToJourneyResponse — 상태 매핑", () => {
  it("거절(rejected)된 견적은 「발송됨·최종제안」이 아니다", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("rejected", { quotation_issued_at: T_ISSUED })
    );
    expect(mapped.status).toBe("rejected");
    expect(mapped.is_final).toBe(false);
  });

  it("발행 후 만료(expired)된 견적도 「발송됨·최종제안」이 아니다", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("expired", { quotation_issued_at: T_ISSUED })
    );
    expect(mapped.status).toBe("expired");
    expect(mapped.is_final).toBe(false);
  });

  it("어드민 정정(accepted→rejected) 뒤 낡은 patient_accepted_at 이 남아도 거절이 이긴다 (2026-08-30 독립 리뷰)", () => {
    // [id]/route.ts 는 어드민에게 TRANSITIONS 우회를 허용하고 patient_accepted_at 은 아무도 안 지운다.
    // 말단 상태를 타임스탬프보다 먼저 판정하지 않으면 거절 견적이 「확정」으로 둔갑 — 이 파일의 존재 이유가 무너진다.
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("rejected", {
        quotation_issued_at: T_ISSUED,
        patient_accepted_at: T_ACCEPTED,
      })
    );
    expect(mapped.status).toBe("rejected");
    expect(mapped.is_final).toBe(false);
  });

  it("만료(expired)도 낡은 patient_accepted_at 을 이긴다 — 말단 상태 우선", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("expired", {
        quotation_issued_at: T_ISSUED,
        patient_accepted_at: T_ACCEPTED,
      })
    );
    expect(mapped.status).toBe("expired");
    expect(mapped.is_final).toBe(false);
  });

  it("발행 전 만료(auto_range → expired)는 환자에게 보인 적이 없으니 draft 취급", () => {
    const mapped = mapCostEstimateToJourneyResponse(estimateRow("expired"));
    expect(mapped.status).toBe("draft");
    expect(mapped.is_final).toBe(false);
  });

  it("PATCH 로 status=issued 만 바뀐 건(타임스탬프 없음)도 발송됨 — 환자 알림과 여정 화면의 모순 방지", () => {
    // [id]/route.ts:241 경로는 quotation_issued_at 없이 issued 전이가 가능하고
    // 273행이 환자에게 「견적 준비됨」 인앱 알림까지 보낸다 — 여정도 같은 걸 봐야 한다.
    const mapped = mapCostEstimateToJourneyResponse(estimateRow("issued"));
    expect(mapped.status).toBe("sent");
    expect(mapped.is_final).toBe(true);
  });

  it("정식 발행(issued + quotation_issued_at) → sent·최종제안 (#1534 의도 유지)", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("issued", { quotation_issued_at: T_ISSUED })
    );
    expect(mapped.status).toBe("sent");
    expect(mapped.is_final).toBe(true);
    expect(mapped.created_at).toBe(T_ISSUED); // 발행 시각이 목록 정렬 기준
  });

  it("수락(accepted) → accepted·최종제안 (#1534 의도 유지)", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("accepted", {
        quotation_issued_at: T_ISSUED,
        patient_accepted_at: T_ACCEPTED,
      })
    );
    expect(mapped.status).toBe("accepted");
    expect(mapped.is_final).toBe(true);
  });

  it("전수 불변식: 원본 8개 상태 모두 매핑 어휘 안이고, is_final=true ⇔ sent/accepted", () => {
    const rows = [
      estimateRow("auto_range"),
      estimateRow("formal_requested"),
      estimateRow("hospital_pending"),
      estimateRow("draft"),
      estimateRow("issued"), // PATCH 전이(타임스탬프 없음)
      estimateRow("issued", { quotation_issued_at: T_ISSUED }),
      estimateRow("accepted", { quotation_issued_at: T_ISSUED, patient_accepted_at: T_ACCEPTED }),
      estimateRow("rejected", { quotation_issued_at: T_ISSUED }),
      estimateRow("expired"),
      estimateRow("expired", { quotation_issued_at: T_ISSUED }),
    ];
    for (const row of rows) {
      const mapped = mapCostEstimateToJourneyResponse(row);
      expect(["draft", "sent", "accepted", "rejected", "expired"]).toContain(mapped.status);
      expect(mapped.is_final).toBe(mapped.status === "sent" || mapped.status === "accepted");
    }
  });
});

describe("여정 단계·알림 — 거절/만료/미발송 견적의 영향", () => {
  it("거절된 견적만 있으면 visa 로 전진하지 않는다 (제안 검토 단계에 머묾)", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("rejected", { quotation_issued_at: T_ISSUED })
    );
    expect(computeCurrentStage(baseJourney([mapped]))).toBe("proposal");
  });

  it("거절된 견적은 알림 배지에 영구히 남지 않는다", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("rejected", { quotation_issued_at: T_ISSUED })
    );
    expect(computeNotificationCount(baseJourney([mapped]))).toBe(0);
  });

  it("발송된(sent) 견적은 알림 배지 +1 — 수락/거절하면 빠진다", () => {
    const sent = mapCostEstimateToJourneyResponse(
      estimateRow("issued", { quotation_issued_at: T_ISSUED })
    );
    expect(computeNotificationCount(baseJourney([sent]))).toBe(1);
  });

  it("환자에게 보낸 적 없는 draft 계열(auto_range 등)만으론 proposal 로 전진하지 않는다", () => {
    const mapped = [
      mapCostEstimateToJourneyResponse(estimateRow("auto_range")),
      mapCostEstimateToJourneyResponse(estimateRow("formal_requested")),
    ];
    expect(computeCurrentStage(baseJourney(mapped))).toBe("inquiry");
  });

  it("발행된 최종 견적은 visa 로 전진 (#1534 의도 유지)", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("issued", { quotation_issued_at: T_ISSUED })
    );
    expect(computeCurrentStage(baseJourney([mapped]))).toBe("visa");
  });

  it("「새 병원 제안 검토」 액션이 발송된 견적으로 실제 도달 가능하다 (전엔 sent && !is_final 이라 영원히 불가)", () => {
    const mapped = mapCostEstimateToJourneyResponse(
      estimateRow("issued", { quotation_issued_at: T_ISSUED })
    );
    const actions = computeNextActions(baseJourney([mapped]), "ko");
    expect(actions.some((a: any) => a.id === "proposals")).toBe(true);
  });

  it("거절/수락된 견적엔 「새 제안 검토」 액션이 뜨지 않는다", () => {
    const mapped = [
      mapCostEstimateToJourneyResponse(estimateRow("rejected", { quotation_issued_at: T_ISSUED })),
      mapCostEstimateToJourneyResponse(
        estimateRow("accepted", { quotation_issued_at: T_ISSUED, patient_accepted_at: T_ACCEPTED })
      ),
    ];
    const actions = computeNextActions(baseJourney(mapped), "ko");
    expect(actions.some((a: any) => a.id === "proposals")).toBe(false);
  });
});
