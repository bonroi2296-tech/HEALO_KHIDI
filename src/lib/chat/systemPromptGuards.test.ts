import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// buildSystemPrompt 은 "server-only" 를 import 하는 무거운 모듈이라 vitest(node)에서
// 직접 import 하면 throw. 대신 소스에 핵심 "행동 가드"가 살아있는지 텍스트로 잠근다.
//
// 왜 (2026-06-21 PO 신고 버그): AI 가
//  (1) 환자가 "지금" 안 밝힌 암종을 대화기록만 보고 멋대로 단정(대장암),
//  (2) "대장암 아니라고" 정정해도 계속 대장암을 설명,
//  (3) 내부 사고/메타("Wait, let's keep it short", "(32 words)")를 답변에 노출.
// → buildSystemPrompt 에 가드 문구를 추가했고, 누가 지우면 이 테스트가 막는다.
const SRC = readFileSync(path.resolve(__dirname, "generateReply.ts"), "utf8");

describe("system prompt behavioral guards (regression lock)", () => {
  it("환자가 현재 메시지에서 안 밝힌 암종 단정 금지 규칙이 있다", () => {
    expect(SRC).toMatch(/NEVER name or assume a specific cancer type/);
    expect(SRC).toMatch(/EXPLICITLY named it in their CURRENT message/);
  });

  it("이전 대화 언급을 단정 근거로 끌고 오지 말라는 규칙이 있다", () => {
    expect(SRC).toMatch(/Earlier mentions in the chat are NOT permission/);
  });

  it("정정 즉시 수용(화제 버리기) 규칙이 있다", () => {
    expect(SRC).toMatch(/HONOR CORRECTIONS INSTANTLY/);
    expect(SRC).toMatch(/DROP that topic completely/);
  });

  it("내부 사고/메타텍스트(단어수·자기지시) 노출 금지 규칙이 있다", () => {
    expect(SRC).toMatch(/OUTPUT ONLY THE FINAL MESSAGE TO THE PATIENT/);
    expect(SRC).toMatch(/no word counts/);
  });

  it("현재 메시지에 암종 없을 때 최상단 강제 지시(코드 게이트)가 있다", () => {
    expect(SRC).toMatch(/TOP PRIORITY — THE USER'S CURRENT MESSAGE DOES NOT NAME A CANCER TYPE/);
    expect(SRC).toMatch(/currentMentionsCancer/);
  });

  it("화제 정정 감지 시 결정적 short-circuit 이 두 응답 경로에 있다", () => {
    expect(SRC).toMatch(/if \(isTopicCorrection\(query\)\)/);
  });
});
