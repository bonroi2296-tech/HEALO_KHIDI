/**
 * 품질 판사(judge) 프롬프트 회귀 잠금 — 2026-08-24, 반성문 #172.
 *
 * 사고: 판사에게 RAG 컨텍스트만 넘기고 «안내자료(careReference)» 는 안 넘겼다.
 *   검증된 수술비·검사비·면역치료 항목은 전부 안내자료에만 있어서,
 *   모델이 자료 그대로 인용해도 판사가 "컨텍스트에 없다" 며 hallucination / fabricated_price 로 깎았다.
 *   2026-08-20 자가시험 19건 중 11건이 이 오탐(위암 $6,000–$18,500 은 자료와 «글자 그대로» 일치).
 *
 * 이 시험이 지키는 것:
 *   ① 안내자료가 판사 프롬프트에 실제로 들어간다
 *   ② 자료가 잘려서 «금액이 사라지는» 일이 없다 (잘림 한도 > 자료 길이)
 *   ③ 컨텍스트가 아무리 길어도 자료를 밀어내지 않는다 (칸을 따로 쓴다)
 *   ④ 가격 뺀 축약판을 넘긴 턴에는 「자료 밖 금액 = fabricated_price」 판정 근거가 남는다
 */
import { describe, it, expect } from "vitest";
import { buildJudgePrompt, REFERENCE_BUDGET } from "./judge";
import { CARE_REFERENCE, CARE_REFERENCE_MINIMAL, pickCareReference } from "./careReference";

const base = { query: "위암 수술 얼마나 드나요?", response: "약 $6,000~$18,500 입니다.", lang: "ko" };

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

  it("🔴 사고 재현: 위암·대장암 참고 금액이 잘리지 않고 판사에게 도달한다", () => {
    const p = buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE });
    // 2026-08-20 에 fabricated_price 로 잘못 찍힌 바로 그 숫자들
    expect(p).toContain("$6,000");   // 위암 하한
    expect(p).toContain("18,500");   // 위암 상한
    expect(p).toContain("$7,500");   // 대장암 하한
    expect(p).toContain("13,500");   // 대장암 상한
    expect(p).toContain("PET-CT");   // 검사비 블록
    expect(p).toContain("Mistletoe"); // 면역치료 블록
  });

  it("자료 전체가 잘림 한도 안에 들어간다 — 자료가 늘면 여기가 먼저 터진다", () => {
    expect(CARE_REFERENCE.length).toBeLessThan(REFERENCE_BUDGET);
    const p = buildJudgePrompt({ ...base, officialReference: CARE_REFERENCE });
    expect(p).toContain(CARE_REFERENCE.slice(-80)); // 꼬리까지 도달
  });

  it("컨텍스트가 길어도 안내자료를 밀어내지 않는다 (칸이 따로다)", () => {
    const p = buildJudgePrompt({
      ...base,
      context: "x".repeat(20_000),
      officialReference: CARE_REFERENCE,
    });
    expect(p).toContain("[OFFICIAL REFERENCE");
    expect(p).toContain("$6,000");
  });

  it("축약판에는 금액이 없다 — 안 물은 턴의 가격 노출은 여전히 잡힌다", () => {
    expect(CARE_REFERENCE_MINIMAL).not.toMatch(/\$[\d,]+/);
    const p = buildJudgePrompt({
      query: "회복에 도움되는 게 있나요?",
      response: "면력한방병원에서 보조 케어를 받으실 수 있습니다.",
      lang: "ko",
      officialReference: CARE_REFERENCE_MINIMAL,
    });
    expect(p).toContain("fabricated_price");
    expect(p).not.toContain("$6,000");
  });
});

describe("pickCareReference — 시스템 프롬프트와 판사가 같은 판을 본다", () => {
  it("비용·서류를 물은 턴 = 전체판(금액 포함)", () => {
    expect(pickCareReference(true)).toBe(CARE_REFERENCE);
    expect(pickCareReference(true)).toMatch(/\$[\d,]+/);
  });
  it("안 물은 턴 = 축약판(금액 없음)", () => {
    expect(pickCareReference(false)).toBe(CARE_REFERENCE_MINIMAL);
  });
});
