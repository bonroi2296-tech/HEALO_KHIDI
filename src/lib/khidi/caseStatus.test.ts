import { describe, it, expect } from "vitest";
import {
  caseStatusLabel,
  caseStatusOrder,
  CASE_STATUS_KEYS,
  CASE_STATUS_STEPS,
} from "./caseStatus";

/**
 * 케이스 진행 단계 변환 — 코디·환자·에이전시가 보는 진행 가시성.
 */
describe("caseStatusLabel", () => {
  it("알려진 키를 한국어 레이블로 바꾼다", () => {
    expect(caseStatusLabel("received")).toBe("문의 접수");
    expect(caseStatusLabel("treatment")).toBe("입국·치료 중");
    expect(caseStatusLabel("completed")).toBe("완료");
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
    expect(caseStatusOrder("received")).toBe(1);
    expect(caseStatusOrder("completed")).toBe(8);
    expect(caseStatusOrder("on_hold")).toBe(99); // 보류는 맨 뒤
  });

  it("빈 값·미등록 키는 0", () => {
    expect(caseStatusOrder(null)).toBe(0);
    expect(caseStatusOrder("nope")).toBe(0);
  });

  it("정상 진행 단계는 순서가 단조 증가한다", () => {
    const flow = [
      "received",
      "pre_consult",
      "hospital_review",
      "scheduling",
      "visa_prep",
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
    expect(CASE_STATUS_KEYS).toContain("received");
  });
});
