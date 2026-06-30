/**
 * 핵심 경로 테스트: 외부 LLM 전송 전 PII 마스킹.
 * 데이터 주권 — 환자 자유텍스트가 외부 AI로 평문 반출되는 빈틈을 막는 가드라 회귀 보호.
 */
import { describe, it, expect, vi } from "vitest";

// redactModelPii 는 `import "server-only"` 를 포함 → 테스트(노드)에선 throw. no-op 무력화.
vi.mock("server-only", () => ({}));

import { redactModelPii, redactMessagesForModel } from "./redactModelPii";

describe("redactModelPii", () => {
  it("이메일을 가린다", () => {
    const out = redactModelPii("연락처는 john.doe@gmail.com 입니다");
    expect(out).not.toContain("john.doe@gmail.com");
    expect(out).toContain("[연락처:이메일]");
  });

  it("국제 전화번호(+82, +7)를 가린다", () => {
    expect(redactModelPii("call me +82 10-1234-5678")).not.toMatch(/1234.?5678/);
    expect(redactModelPii("+7 707 123 4567")).toContain("[연락처:전화]");
  });

  it("국내 형식 전화번호(010-1234-5678)를 가린다", () => {
    const out = redactModelPii("내 번호 010-1234-5678 로 연락주세요");
    expect(out).not.toContain("010-1234-5678");
    expect(out).toContain("[연락처:전화]");
  });

  it("주민등록번호(6-7)를 가린다", () => {
    const out = redactModelPii("900101-1234567");
    expect(out).toBe("[식별번호]");
  });

  it("여권번호(M12345678)를 가린다", () => {
    expect(redactModelPii("passport M12345678")).toContain("[여권번호]");
  });

  it("의료 본문(암종·증상·질문)은 보존한다", () => {
    const msg = "유방암 2기인데 항암치료 비용이 궁금해요";
    expect(redactModelPii(msg)).toBe(msg);
  });

  it("일반 숫자·금액은 전화로 오인하지 않는다", () => {
    // 구분자 없는 연속 숫자/금액은 전화 패턴이 아니다
    expect(redactModelPii("비용이 18000000원 정도인가요?")).toBe(
      "비용이 18000000원 정도인가요?"
    );
    expect(redactModelPii("$13,500 정도")).toBe("$13,500 정도");
    expect(redactModelPii("2026년 6월 29일")).toBe("2026년 6월 29일");
  });

  it("null/빈값 안전", () => {
    expect(redactModelPii(null)).toBe("");
    expect(redactModelPii(undefined)).toBe("");
    expect(redactModelPii("")).toBe("");
  });

  it("redactMessagesForModel: content만 마스킹하고 원본은 불변", () => {
    const msgs = [
      { role: "user", content: "내 메일 a@b.com" },
      { role: "assistant", content: "도와드릴게요" },
    ];
    const out = redactMessagesForModel(msgs);
    expect(out[0].content).toContain("[연락처:이메일]");
    expect(out[1].content).toBe("도와드릴게요");
    // 원본 불변
    expect(msgs[0].content).toBe("내 메일 a@b.com");
  });
});
