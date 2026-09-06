import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/inquiry/followUps", () => ({ readFollowUps: () => [], BY_PATIENT_LINK: "환자(진행상황 링크)" }));
vi.mock("./preVisitFollowup", () => ({ PRE_VISIT_REMINDER_TYPE: "pre_visit_followup" }));
vi.mock("./rebookingRequest", () => ({ REBOOKING_SOURCE_PATIENT: "patient_request" }));

import { urgencyFromAction, summarizePostcare } from "./postcareBoard";

describe("urgencyFromAction — 판정 코드 → 4단계", () => {
  it("응급·의료진/담당자 상향·경과관찰 순으로 매핑한다", () => {
    expect(urgencyFromAction("emergency_refer", 0.2)).toBe("emergency");
    expect(urgencyFromAction("escalate_agent", 0.2)).toBe("high");
    expect(urgencyFromAction("escalate_doctor", 0.2)).toBe("high");
    expect(urgencyFromAction("schedule_followup", 0.2)).toBe("medium");
  });
  it("코드가 없으면 위험도 점수로 가른다", () => {
    expect(urgencyFromAction(null, 0.75)).toBe("high");
    expect(urgencyFromAction(null, 0.5)).toBe("medium");
    expect(urgencyFromAction("auto_response", 0.1)).toBe("low");
  });
});

describe("summarizePostcare — 카드 숫자", () => {
  it("열린 요청은 pending·proposed 만, 위험 증상은 high·emergency 만 센다", () => {
    const s = summarizePostcare({
      requests: [
        { id: "1", inquiryId: 1, source: "patient_request", status: "pending", reason: null, nextActionAt: null, createdAt: null },
        { id: "2", inquiryId: 1, source: "symptom", status: "proposed", reason: null, nextActionAt: null, createdAt: null },
        { id: "3", inquiryId: 2, source: "patient_request", status: "confirmed", reason: null, nextActionAt: null, createdAt: null },
      ],
      symptoms: [
        { id: "a", inquiryId: 1, severity: 8, urgency: "high", action: null, text: "", aiRaised: true, assessment: null, createdAt: null },
        { id: "b", inquiryId: 1, severity: 2, urgency: "low", action: null, text: "", aiRaised: false, assessment: null, createdAt: null },
      ],
      cadence: [
        { inquiryId: 1, phase: "d14", status: "sent", reason: null, at: null },
        { inquiryId: 2, phase: "d3", status: "skipped", reason: "stale", at: null },
      ],
      notes: [],
    });
    expect(s).toEqual({ openRequests: 2, symptoms30d: 2, highSymptoms30d: 1, cadenceSent30d: 1, cadenceSkipped30d: 1 });
  });
});
