/**
 * 품질 판사(judge) 프롬프트 회귀 잠금 — 2026-08-24, 반성문 #173.
 *
 * 사고: 판사에게 RAG 컨텍스트만 넘기고 «안내자료(careReference)» 는 안 넘겼다.
 *   검증된 수술비·검사비·면역치료 항목은 전부 안내자료에만 있어서,
 *   모델이 자료 그대로 인용해도 판사가 "컨텍스트에 없다" 며 hallucination / fabricated_price 로 깎았다.
 *   실측: ai_response_evaluations 481건 중 hallucination 268건 · fabricated_price 47건
 *   (위암 $6,000–$18,500 은 자료와 «글자 그대로» 일치했다).
 *
 * ⚠️ 시험 짤 때 함정: 응답·질문 문자열에 자료의 숫자를 넣으면 «응답 때문에» 통과한다.
 *   그러면 자료 주입을 되돌려도 시험이 초록으로 남는다(독립 리뷰가 실제로 이 구멍을 잡아냈다).
 *   그래서 아래 base 응답에는 자료의 숫자를 «하나도» 넣지 않고, 검사도 자료 칸만 떼어내서 본다.
 *
 * 이 시험이 지키는 것:
 *   ① 안내자료가 판사 프롬프트에 실제로 들어간다
 *   ② 자료가 잘려서 «금액이 사라지는» 일이 없다 (잘림 한도 > 자료 길이)
 *   ③ 컨텍스트가 아무리 길어도 자료를 밀어내지 않는다 (칸을 따로 쓴다)
 *   ④ 축약판을 넘긴 턴엔 판사 프롬프트에 금액이 «전혀» 안 들어간다
 *      → 「안 물었는데 가격 흘림」(#625 부류)을 판사가 계속 잡는다
 */
import { describe, it, expect } from "vitest";
import { buildJudgePrompt, REFERENCE_BUDGET } from "./judge";
import { CARE_REFERENCE, CARE_REFERENCE_MINIMAL, pickCareReference } from "./careReference";

/** 자료의 숫자를 일부러 하나도 안 쓴다 — 통과가 «자료 때문»이어야 한다. */
const base = {
  query: "위암 수술 얼마나 드나요?",
  response: "담당 코디네이터가 병원 견적을 받아 안내해 드리겠습니다.",
  lang: "ko",
};

/** 판사 프롬프트에서 OFFICIAL REFERENCE 칸만 떼어낸다(응답·질문 때문에 통과하는 걸 막는다). */
function referenceBlock(prompt: string): string {
  const i = prompt.indexOf("[OFFICIAL REFERENCE");
  if (i < 0) return "";
  const j = prompt.indexOf("[AI 응답]", i);
  return prompt.slice(i, j < 0 ? undefined : j);
}

describe("buildJudgePrompt — 안내자료 주입", () => {
  it("안내자료를 넘기면 판사 프롬프트에 OFFICIAL REFERENCE 칸이 생긴다", () => {
    const p = buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE });
    expect(p).toContain("[OFFICIAL REFERENCE");
    expect(p).toContain("환각이 아니다");
  });

  it("안 넘기면 그 칸이 아예 없다 (옛 동작 유지)", () => {
    const p = buildJudgePrompt(base);
    expect(p).not.toContain("[OFFICIAL REFERENCE");
  });

  it("🔴 사고 재현: 오탐으로 찍혔던 그 숫자들이 «자료 칸 안에서» 판사에게 도달한다", () => {
    const ref = referenceBlock(buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE }));
    // 2026-08-20 에 fabricated_price 로 잘못 찍힌 바로 그 값들
    expect(ref).toContain("$6,000");    // 위암 하한
    expect(ref).toContain("18,500");    // 위암 상한
    expect(ref).toContain("$7,500");    // 대장암 하한
    expect(ref).toContain("13,500");    // 대장암 상한
    expect(ref).toContain("PET-CT");    // 검사비 블록
    expect(ref).toContain("Mistletoe"); // 면역치료 블록
  });

  it("자료 전체가 잘림 한도 안에 들어간다 — 자료가 늘면 여기가 먼저 터진다", () => {
    expect(CARE_REFERENCE.length).toBeLessThan(REFERENCE_BUDGET);
    const ref = referenceBlock(buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE }));
    expect(ref).toContain(CARE_REFERENCE.slice(-80)); // 꼬리까지 도달
  });

  it("컨텍스트가 길어도 안내자료를 밀어내지 않는다 (칸이 따로다)", () => {
    const ref = referenceBlock(buildJudgePrompt({
      ...base,
      context: "x".repeat(20_000),
      officialReference: CARE_REFERENCE,
    }));
    expect(ref).toContain("$6,000");
  });

  it("축약판을 넘긴 턴엔 판사 프롬프트에 금액이 하나도 안 들어간다 (#625 검출 유지)", () => {
    const p = buildJudgePrompt({
      query: "회복에 도움되는 게 있나요?",
      response: "면력한방병원에서 보조 케어를 받으실 수 있습니다.",
      lang: "ko",
      officialReference: CARE_REFERENCE_MINIMAL,
    });
    const ref = referenceBlock(p);
    expect(ref).toContain("범위 요약");   // 축약판이 실제로 들어갔다
    expect(ref).not.toMatch(/\$[\d,]+/);  // 그런데 금액은 없다
    // 판사가 「자료 밖 금액 = 지어낸 것」이라 판정할 근거 문구도 같이 있어야 한다
    expect(p).toContain("자료 밖에서 지어낸 것이다");
  });

  it("자료 범위 안이라도 «콕 집은 금액»은 봐주지 말라는 지시가 있다", () => {
    const p = buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE });
    expect(p).toContain("범위 안이어도 위반");
  });
});

describe("pickCareReference — 시스템 프롬프트와 판사가 같은 판을 본다", () => {
  it("비용·서류를 물은 턴 = 전체판(금액 포함)", () => {
    expect(pickCareReference(true)).toBe(CARE_REFERENCE);
    expect(pickCareReference(true)).toMatch(/\$[\d,]+/);
  });
  it("안 물은 턴 = 축약판(금액 없음)", () => {
    expect(pickCareReference(false)).toBe(CARE_REFERENCE_MINIMAL);
    expect(pickCareReference(false)).not.toMatch(/\$[\d,]+/);
  });
});
