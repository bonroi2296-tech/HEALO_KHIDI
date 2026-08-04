/**
 * 공개 진행상황 화면이 이 함수에 기대는 3가지만 못박는다.
 * 버그였던 것: 화면이 저장값을 그대로 찍어 러시아어 화면에 "stomach"이 나왔다(67건 중 29건, 2026-08-04).
 */
import { describe, it, expect } from "vitest";
import { cancerTypeLabelL } from "./medicalLabels";

describe("cancerTypeLabelL — 공개 진행상황 화면이 기대는 것", () => {
  it("영어 코드는 보는 사람 언어로 바뀐다", () => {
    expect(cancerTypeLabelL("stomach", "ru")).not.toBe("stomach");
    expect(cancerTypeLabelL("other", "ko")).toBe("기타");
  });

  it("자유입력(한글 등)은 원문 그대로 — 지어내지 않는다", () => {
    expect(cancerTypeLabelL("위암", "ru")).toBe("위암");
  });

  it("빈값이면 빈 문자열 — 화면이 그 칸을 통째로 숨길 수 있어야 한다", () => {
    expect(cancerTypeLabelL(null, "ko")).toBe("");
    expect(cancerTypeLabelL(undefined, "ko")).toBe("");
  });
});
