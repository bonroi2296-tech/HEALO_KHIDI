import { describe, it, expect } from "vitest";
import {
  caseStatusLabel,
  caseStatusOrder,
  outcomeForHospitalLeadStatus,
  outcomeForCaseStatus,
  caseStatusToJourneyStage,
  CASE_STATUS_KEYS,
  CASE_STATUS_STEPS,
} from "./caseStatus";

/**
 * 케이스 진행 단계 변환 — 코디·환자·에이전시가 보는 진행 가시성.
 */
describe("caseStatusLabel", () => {
  it("알려진 키를 한국어 레이블로 바꾼다", () => {
    expect(caseStatusLabel("intake")).toBe("문의·의뢰 접수");
    expect(caseStatusLabel("treatment")).toBe("입국·치료 중");
    expect(caseStatusLabel("completed")).toBe("완료");
  });

  it("구 9단계 키(과거 이력)도 별칭으로 신단계 레이블로 바꾼다", () => {
    expect(caseStatusLabel("received")).toBe("문의·의뢰 접수");
    expect(caseStatusLabel("pre_consult")).toBe("상담·검토 진행");
    expect(caseStatusLabel("hospital_review")).toBe("상담·검토 진행");
    expect(caseStatusLabel("scheduling")).toBe("일정·비자 준비");
    expect(caseStatusLabel("visa_prep")).toBe("일정·비자 준비");
  });

  it("빈 값은 '미설정'", () => {
    expect(caseStatusLabel(null)).toBe("미설정");
    expect(caseStatusLabel(undefined)).toBe("미설정");
    expect(caseStatusLabel("")).toBe("미설정");
  });

  it("미등록 키는 원문을 그대로 둔다", () => {
    expect(caseStatusLabel("unknown_key")).toBe("unknown_key");
  });
});

describe("caseStatusOrder", () => {
  it("단계 순서를 반환한다", () => {
    expect(caseStatusOrder("intake")).toBe(1);
    expect(caseStatusOrder("completed")).toBe(6);
    expect(caseStatusOrder("on_hold")).toBe(99); // 보류는 맨 뒤
  });

  it("빈 값·미등록 키는 0", () => {
    expect(caseStatusOrder(null)).toBe(0);
    expect(caseStatusOrder("nope")).toBe(0);
  });

  it("정상 진행 단계는 순서가 단조 증가한다", () => {
    const flow = [
      "intake",
      "consultation",
      "preparation",
      "treatment",
      "follow_up",
      "completed",
    ];
    const orders = flow.map(caseStatusOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  it("KEYS 와 STEPS 가 일관된다", () => {
    expect(CASE_STATUS_KEYS).toHaveLength(CASE_STATUS_STEPS.length);
    expect(CASE_STATUS_KEYS).toContain("intake");
  });
});

describe("outcomeForHospitalLeadStatus (병원 확정 → 유치 자동 집계)", () => {
  it("'converted'(치료 확정)는 유치(admitted)로 집계", () => {
    expect(outcomeForHospitalLeadStatus("converted")).toBe("admitted");
  });

  it("그 외 병원 상태는 outcome 을 건드리지 않는다(null)", () => {
    for (const s of ["sent", "viewed", "replied", "rejected"]) {
      expect(outcomeForHospitalLeadStatus(s)).toBeNull();
    }
  });

  it("빈 값·미상 상태도 null", () => {
    expect(outcomeForHospitalLeadStatus(null)).toBeNull();
    expect(outcomeForHospitalLeadStatus(undefined)).toBeNull();
    expect(outcomeForHospitalLeadStatus("")).toBeNull();
    expect(outcomeForHospitalLeadStatus("nope")).toBeNull();
  });
});

describe("outcomeForCaseStatus (코디 case_status 전진 → 유치 자동 집계, EDGE-2/POSTMORTEM #17 잔여위험)", () => {
  it("입국·치료 이후 단계(treatment/follow_up/completed)는 유치(admitted)", () => {
    expect(outcomeForCaseStatus("treatment")).toBe("admitted");
    expect(outcomeForCaseStatus("follow_up")).toBe("admitted");
    expect(outcomeForCaseStatus("completed")).toBe("admitted");
  });

  it("입국 전 단계는 아직 유치 아님(null) — 비자준비도 아직 미확정", () => {
    for (const s of ["intake", "consultation", "preparation", "on_hold"]) {
      expect(outcomeForCaseStatus(s)).toBeNull();
    }
  });

  it("빈 값·미상도 null", () => {
    expect(outcomeForCaseStatus(null)).toBeNull();
    expect(outcomeForCaseStatus(undefined)).toBeNull();
    expect(outcomeForCaseStatus("")).toBeNull();
    expect(outcomeForCaseStatus("nope")).toBeNull();
  });
});

describe("caseStatusToJourneyStage (EDGE-1: 코디 case_status → 환자 여정바 단계)", () => {
  it("각 case_status 를 알맞은 여정 단계로 매핑", () => {
    expect(caseStatusToJourneyStage("intake")).toBe("inquiry");
    expect(caseStatusToJourneyStage("consultation")).toBe("consultation");
    expect(caseStatusToJourneyStage("preparation")).toBe("visa");
    expect(caseStatusToJourneyStage("treatment")).toBe("treatment");
    expect(caseStatusToJourneyStage("follow_up")).toBe("recovery");
    expect(caseStatusToJourneyStage("completed")).toBe("recovery");
  });

  it("구 9단계 키(과거 이력)도 별칭으로 매핑된다", () => {
    expect(caseStatusToJourneyStage("received")).toBe("inquiry");
    expect(caseStatusToJourneyStage("pre_consult")).toBe("consultation");
    expect(caseStatusToJourneyStage("hospital_review")).toBe("consultation");
    expect(caseStatusToJourneyStage("scheduling")).toBe("visa");
    expect(caseStatusToJourneyStage("visa_prep")).toBe("visa");
  });

  it("보류(on_hold)는 단계를 강제하지 않는다(null → 기존 계산 유지)", () => {
    expect(caseStatusToJourneyStage("on_hold")).toBeNull();
  });

  it("빈 값·미상도 null", () => {
    expect(caseStatusToJourneyStage(null)).toBeNull();
    expect(caseStatusToJourneyStage(undefined)).toBeNull();
    expect(caseStatusToJourneyStage("")).toBeNull();
    expect(caseStatusToJourneyStage("nope")).toBeNull();
  });

  it("on_hold 외 모든 case_status 키가 매핑을 가진다", () => {
    for (const k of CASE_STATUS_KEYS) {
      if (k === "on_hold") continue;
      expect(caseStatusToJourneyStage(k)).not.toBeNull();
    }
  });
});
