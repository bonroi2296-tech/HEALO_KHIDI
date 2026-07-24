import { describe, it, expect } from "vitest";
import { shouldPromoteToInquiry } from "./intakeGate";

const empty = {
  chief_complaint: null, // 원문 복사 필드 — 신호 아님
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
  it("초단문 잡담(추출 신호 0 + 최소 분량 미달) → 승격하지 않는다 (2026-07-23 inquiry#40 부류)", () => {
    expect(shouldPromoteToInquiry(empty, false, "안녕? 안녕? 안녕?")).toBe(false);
    expect(shouldPromoteToInquiry(empty, false, "hi hello hey")).toBe(false);
    expect(shouldPromoteToInquiry(empty, false, "")).toBe(false);
  });

  it("사람 연결·접수 요청(핸드오프)이면 내용과 무관하게 즉시 승격", () => {
    expect(shouldPromoteToInquiry(empty, true, "")).toBe(true);
  });

  it("의미 신호가 1개라도 추출되면 승격 — 문자열·배열·불리언 각 타입", () => {
    expect(shouldPromoteToInquiry({ ...empty, body_part: "stomach" }, false, "")).toBe(true);
    expect(shouldPromoteToInquiry({ ...empty, contraindications: ["warfarin"] }, false, "")).toBe(true);
    expect(shouldPromoteToInquiry({ ...empty, allergy_flag: true }, false, "")).toBe(true);
  });

  it("빈 배열·빈 문자열·false 는 신호가 아니다", () => {
    expect(
      shouldPromoteToInquiry(
        { ...empty, contraindications: [], body_part: "", allergy_flag: false },
        false,
        "hi"
      )
    ).toBe(false);
  });

  it("비영어 실상담은 추출 신호가 0이어도 분량 폴백으로 승격 — 영어전용 추출기 구멍 회귀 방지(독립 리뷰 CONFIRMED)", () => {
    // 러시아어(핵심 타겟) — 추출기는 영어 키워드뿐이라 신호 필드 전부 null 이 되는 입력
    expect(shouldPromoteToInquiry(empty, false, "Хочу операцию на носу, сколько стоит?")).toBe(true);
    // 짧은 러시아어 실상담("암 치료 원해요")도 문턱(12자)을 넘는다
    expect(shouldPromoteToInquiry(empty, false, "Хочу лечить рак")).toBe(true);
    // 한국어 실상담
    expect(shouldPromoteToInquiry(empty, false, "위암 4기인데 한국에서 치료받고 싶어요")).toBe(true);
  });
});
