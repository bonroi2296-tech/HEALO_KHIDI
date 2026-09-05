import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// 왜 이 잠금장치가 있나 (2026-08-21):
// 자가시험이 «간소화 재현본»으로 AI를 부르면 3-Tier RAG·실제 시스템 프롬프트를 하나도
// 검증하지 못한다. 실제로 그 상태로 2,262건이 쌓였고, 그 latency 는 응답 길이와 상관 0.200
// (고정비 4,983ms)로 실서비스 스트리밍(첫 토큰 중앙값 2.30초)과 아예 다른 자였다.
// 되돌아가는 길은 하나뿐 — 여기서 다시 모델을 직접 부르는 것. 그걸 막는다.
const SRC = readFileSync(path.resolve(__dirname, "regressionRunner.ts"), "utf8");

describe("AI 자가시험은 실서비스 경로를 탄다 (회귀 잠금)", () => {
  it("응답 생성은 streamChatReply 로만 한다", () => {
    expect(SRC).toMatch(/import \{ streamChatReply \} from "@\/lib\/chat\/generateReply"/);
    expect(SRC).toMatch(/await streamChatReply\(/);
  });

  it("모델 직접 호출은 Judge 채점 1곳뿐 (답변 생성용으로 다시 포크하면 실패)", () => {
    const calls = SRC.match(/await generateText\(/g) ?? [];
    expect(calls.length).toBe(1);
  });

  it("시스템 프롬프트를 이 파일에 다시 하드코딩하지 않는다", () => {
    expect(SRC).not.toMatch(/buildSystemPrompt/);
    expect(SRC).not.toMatch(/ANTI-HALLUCINATION/);
  });

  it("첫 토큰 시각과 RAG 조각 수를 같이 저장한다", () => {
    expect(SRC).toMatch(/first_token_ms/);
    expect(SRC).toMatch(/rag_chunk_count/);
  });

  it("시험 트래픽 표시(isRegressionTest)를 달아 실서비스 품질지표 오염을 막는다", () => {
    expect(SRC).toMatch(/isRegressionTest: true/);
    const GEN = readFileSync(path.resolve(__dirname, "generateReply.ts"), "utf8");
    // 표시가 있으면 실서비스 Judge(코디 긴급알림 + ai_response_evaluations 적재)를 건너뛴다
    const guarded = GEN.match(/if \(!session\.isRegressionTest\) runJudgeInBackground\(/g) ?? [];
    expect(guarded.length).toBe(2); // generateChatReply · streamChatReply 양쪽
  });
});
