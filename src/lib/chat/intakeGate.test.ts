import { describe, it, expect } from "vitest";
import { shouldPromoteToInquiry } from "./intakeGate";

const empty = {
  chief_complaint: "안녕? 안녕? 안녕?", // 원문 복사 — 신호 아님
  body_part: null,
  timeline: null,
  budget: null,
  duration: null,
  severity: null,
  contraindications: null,
  allergy_flag: null,
  medications_flag: null,
};

describe("문의 승격 게이트", () => {
  it("잡담만 3턴(추출 필드 전부 비어있음) → 승격하지 않는다 (2026-07-23 inquiry#40 재발 방지)", () => {
    expect(shouldPromoteToInquiry(empty, false)).toBe(false);
  });

  it("사람 연결·접수 요청(핸드오프)이면 내용과 무관하게 즉시 승격", () => {
    expect(shouldPromoteToInquiry(empty, true)).toBe(true);
  });

  it("의미 신호가 1개라도 추출되면 승격 — 문자열·배열·불리언 각 타입", () => {
    expect(shouldPromoteToInquiry({ ...empty, body_part: "stomach" }, false)).toBe(true);
    expect(shouldPromoteToInquiry({ ...empty, contraindications: ["warfarin"] }, false)).toBe(true);
    expect(shouldPromoteToInquiry({ ...empty, allergy_flag: true }, false)).toBe(true);
  });

  it("빈 배열·빈 문자열·false 는 신호가 아니다", () => {
    expect(
      shouldPromoteToInquiry(
        { ...empty, contraindications: [], body_part: "", allergy_flag: false },
        false
      )
    ).toBe(false);
  });
});
