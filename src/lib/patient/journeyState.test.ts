import { describe, it, expect, vi } from "vitest";

// journeyState.js 는 브라우저 Supabase 클라이언트를 import 한다(순수함수 테스트엔 불필요).
// node 환경에서 import 부작용을 막기 위해 mock 으로 대체.
vi.mock("../supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({}),
}));

import { computeCurrentStage } from "./journeyState.js";

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
