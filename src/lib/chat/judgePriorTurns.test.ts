import { describe, it, expect } from "vitest";
import { priorUserTurnsFrom, buildJudgePrompt } from "./judge";

/**
 * 이 시험이 지키는 것: 「판사가 앞 턴의 사용자 발화를 실제로 본다」.
 *
 * 2026-09-09 실사고. 환자가 대량 코피를 1,256자로 서술하고 다음 턴에 "의사들이 진단을 못 내렸다,
 * 무슨 병인지 알고 싶다"라고만 물었다. 판사는 «마지막 질문 한 줄»만 받아서, 봇의 정확한 답을
 * 「질문에 없는 '출혈' 증상을 지어냈다」며 62점 환각으로 찍고 직원 4명에게 헛경보를 울렸다.
 * 봇이 맞았고 판사가 틀렸다.
 */
const base = {
  response: "…",
  context: undefined,
  officialReference: undefined,
  sessionFacts: undefined,
  priorUserTurns: undefined,
  lang: "ru",
};

describe("priorUserTurnsFrom", () => {
  it("이번 턴 질문(마지막 사용자 발화)은 빼고 앞선 발화만 모은다", () => {
    const out = priorUserTurnsFrom([
      { role: "user", content: "아침에 코피가 터져 입으로 넘어왔습니다" },
      { role: "assistant", content: "…" },
      { role: "user", content: "무슨 병인지 알고 싶습니다" },
    ]);
    expect(out).toBe("아침에 코피가 터져 입으로 넘어왔습니다");
  });

  it("여러 발화는 오래된 것부터 이어 붙인다", () => {
    const out = priorUserTurnsFrom([
      { role: "user", content: "첫째" },
      { role: "user", content: "둘째" },
      { role: "user", content: "이번 질문" },
    ]);
    expect(out).toBe("첫째\n---\n둘째");
  });

  it("앞선 발화가 없으면 undefined — 빈 칸을 프롬프트에 넣지 않는다", () => {
    expect(priorUserTurnsFrom([{ role: "user", content: "처음이자 이번 질문" }])).toBeUndefined();
    expect(priorUserTurnsFrom([])).toBeUndefined();
    expect(priorUserTurnsFrom(null)).toBeUndefined();
  });

  it("도우미(assistant) 발화는 섞지 않는다", () => {
    const out = priorUserTurnsFrom([
      { role: "user", content: "환자 말" },
      { role: "assistant", content: "봇 말" },
      { role: "user", content: "이번 질문" },
    ]);
    expect(out).toBe("환자 말");
    expect(out).not.toContain("봇 말");
  });
});

describe("buildJudgePrompt", () => {
  it("🔴 앞선 발화가 프롬프트에 실제로 실린다", () => {
    const p = buildJudgePrompt({
      ...base,
      query: "무슨 병인지 알고 싶습니다",
      priorUserTurns: "아침 8시경 코피가 시작돼 입으로 피가 넘어왔습니다",
    });
    expect(p).toContain("PRIOR USER TURNS");
    expect(p).toContain("입으로 피가 넘어왔습니다");
  });

  it("앞선 발화가 없으면 그 칸 자체가 안 붙는다", () => {
    const p = buildJudgePrompt({ ...base, query: "안녕하세요" });
    expect(p).not.toContain("PRIOR USER TURNS —");
  });

  it("판사에게 «이 칸도 컨텍스트다»라고 알린다", () => {
    const p = buildJudgePrompt({ ...base, query: "q", priorUserTurns: "앞선 말" });
    // 이 문장이 빠지면 칸만 붙고 판정 기준은 그대로라 오탐이 계속된다.
    expect(p).toMatch(/「컨텍스트」의 범위:.*PRIOR USER TURNS/);
  });

  it("긴 증상 서술도 잘리지 않고 실린다(실사고 1,256자)", () => {
    const long = "코피 서술 ".repeat(200); // 1,000자 이상
    const p = buildJudgePrompt({ ...base, query: "q", priorUserTurns: long });
    expect(p).toContain(long.slice(0, 1200));
  });
});
