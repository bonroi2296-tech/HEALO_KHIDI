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

  // ── 2026-06-22 PO 재현: 비로그인·연락처 없는 사용자에게 "접수 완료/코디가 연락"이라는
  //    거짓 약속 + 세션 유실 질문에 즉흥 오답. 상태 사실 주입으로 차단. (state-detection)
  it("접수(REGISTER) 멘트가 연락처 유무(hasReachableContact)로 분기된다", () => {
    expect(SRC).toMatch(/hasReachableContact/);
    expect(SRC).toMatch(/Do NOT claim they are 'registered'/);
    expect(SRC).toMatch(/FALSE promise/);
  });

  it("세션·로그인 상태 사실(SESSION & IDENTITY FACTS) 블록이 있다", () => {
    expect(SRC).toMatch(/SESSION & IDENTITY FACTS/);
    expect(SRC).toMatch(/auto-resumes for 30 days/);
    expect(SRC).toMatch(/The patient is LOGGED IN/);
    expect(SRC).toMatch(/never guess or improvise/);
  });

  it("감정 격앙 시 정보 덤프 금지(DE-ESCALATION) 규칙이 있다", () => {
    expect(SRC).toMatch(/DE-ESCALATION/);
    expect(SRC).toMatch(/do NOT respond by dumping documents/);
  });
});

// 접수 연락처 게이트의 실제 동작 검증은 ./contactGate.test.ts 에서(순수 모듈이라 직접 import 가능).
// (과거엔 server-only 라 텍스트로만 잠갔으나, contactGate.ts 로 분리해 진짜 단위테스트로 대체.)

// 🔑 마스터키 '힐로'/'healo' — 자기분석 모드 회귀 잠금.
// server-only 모듈이라 직접 import 불가 → 소스에 트리거·분석 배선이 살아있는지 텍스트로 잠근다.
describe("master key (힐로/healo) self-analysis (regression lock)", () => {
  it("트리거 정규식이 힐로/healo 두 멘트를 모두 인식한다", () => {
    const m = SRC.match(/const MASTER_KEY_RE = (\/.*\/i);/);
    expect(m).toBeTruthy();
    // 소스의 실제 정규식을 그대로 평가해 동작을 검증(문자열 잠금이 아니라 행동 잠금)
    // eslint-disable-next-line no-eval
    const re: RegExp = eval(m![1]);
    expect(re.test("힐로")).toBe(true);
    expect(re.test("healo")).toBe(true);
    expect(re.test("HEALO")).toBe(true);
    expect(re.test("힐로 마지막 답변만 분석해줘")).toBe(true);
    expect(re.test("healo focus on tone")).toBe(true);
    // 오탐 방지: 일반 질의는 트리거가 아니어야
    expect(re.test("폐암 치료비 얼마예요")).toBe(false);
    expect(re.test("hello")).toBe(false);
    expect(re.test("힐로분석")).toBe(false); // 바로 글자가 붙으면 일반 질의
  });

  it("자기분석 코어와 두 응답 경로 배선이 있다", () => {
    expect(SRC).toMatch(/export async function generateMasterKeyAnalysis/);
    expect(SRC).toMatch(/if \(isMasterKey\(query\)\)/);
  });

  it("전체 스레드 기반 분석(라우트 12개 한계 우회)을 한다", () => {
    expect(SRC).toMatch(/buildThreadTranscript/);
    expect(SRC).toMatch(/MASTER_KEY_TRANSCRIPT_LIMIT/);
  });
});

// 🔁 디플렉션 루프 방지(2026-06-22 사고) 회귀 잠금.
describe("deflection-loop guards (regression lock)", () => {
  it("자기 답변 복사 금지 프롬프트 규칙이 있다", () => {
    expect(SRC).toMatch(/DO NOT ECHO YOUR OWN PREVIOUS REPLIES/);
    expect(SRC).toMatch(/do not answer it with more reassurance|Never fill a turn with reassurance/);
  });

  it("이모지·필러 톤 가드가 있다", () => {
    expect(SRC).toMatch(/NO decorative emoji and NO filler/);
  });

  it("반복 감지 회로차단기(Jaccard)와 두 경로 주입 배선이 있다", () => {
    expect(SRC).toMatch(/function detectRepetitiveAssistant/);
    expect(SRC).toMatch(/REPETITION_GUARD/);
    expect(SRC).toMatch(/jaccardSimilarity/);
    // 두 응답 경로(비스트리밍·스트리밍)에 baseSystem 주입이 들어가 있어야.
    // 인자명은 messages 또는 마스킹본 safeMessages 둘 다 허용(데이터 주권 마스킹 도입 후).
    expect((SRC.match(/detectRepetitiveAssistant\((?:safeMessages|messages)\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
