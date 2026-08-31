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

  // 반성문 #126: 센터 메뉴판 금액은 «국내 비급여 정가»지 외국인 국제수가가 아니다.
  // 이 고지를 RAG 문서(자료)에만 뒀더니 러시아어 답변에서 통째로 사라졌다(한국어만 우연히 생존).
  // ⚠️ 이 테스트가 보증하는 건 «규칙이 프롬프트에 살아있다»까지다 — «모델이 실제로 지켰다»는
  //    다국어 실측/회귀 채점의 몫이지 여기서 볼 수 없다. 그래도 누가 지우는 것만은 막는다.
  it("국내 비급여가를 외국인 견적처럼 답하지 말라는 규칙이 있다", () => {
    expect(SRC).toMatch(/KOREAN DOMESTIC self-pay list prices, NOT foreign-patient international rates/);
    expect(SRC).toMatch(/IN THE USER'S OWN LANGUAGE/);
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

  // ── 2026-07-13 품질경고 4건 재현: 환자가 올린 첨부(검사지)를 AI가 읽을 수 없는데
  //    내용을 지어내 설명(자궁경부 세포검사 등) → hallucination 저점수. 첨부 스레드에만
  //    hasAttachments 하드룰을 주입해 차단. 누가 지우면 이 테스트가 막는다.
  it("첨부 스레드에서 파일 내용 추측 금지(UPLOADED FILES) 하드룰이 있다", () => {
    expect(SRC).toMatch(/UPLOADED FILES \(CRITICAL/);
    expect(SRC).toMatch(/You CANNOT open, see, or read the contents of ANY uploaded file/);
    expect(SRC).toMatch(/Inventing file contents is the single worst failure/);
    // 세션 사실 주입 배선(hasAttachments)이 살아 있어야
    expect(SRC).toMatch(/hasAttachments\s*=\s*false\s*\}\s*=\s*session/);
  });
});

// 접수 연락처 게이트의 실제 동작 검증은 ./contactGate.test.ts 에서(순수 모듈이라 직접 import 가능).
// (과거엔 server-only 라 텍스트로만 잠갔으나, contactGate.ts 로 분리해 진짜 단위테스트로 대체.)

// 🔑 마스터키 '힐로' — 자기분석 모드 회귀 잠금.
// server-only 모듈이라 직접 import 불가 → 소스와 동일 로직으로 정규식을 재구성해 행동을 잠근다.
// ⚠️ 2026-07-02: 트리거어에서 라틴 'healo' 제거(옛 브랜드명 — 실사용자가 'Healo, ...'로 시작하면
// 내부 자기분석이 노출되던 구멍). 기본 '힐로' + env CHAT_MASTER_KEY_WORD 교체 방식.
describe("master key (힐로) self-analysis (regression lock)", () => {
  it("트리거는 기본 '힐로'만 — 옛 브랜드 'healo'는 더 이상 트리거가 아니다", () => {
    // 소스와 동일한 빌드 로직(기본어 힐로)으로 정규식 재구성
    expect(SRC).toMatch(/CHAT_MASTER_KEY_WORD \|\| "힐로"/);
    const re = /^(힐로)([\s,.:!?~·]|$)/i;
    expect(re.test("힐로")).toBe(true);
    expect(re.test("힐로 마지막 답변만 분석해줘")).toBe(true);
    // 옛 브랜드명·일반 질의는 트리거가 아니어야(실사용자 입력 충돌 방지)
    expect(re.test("healo")).toBe(false);
    expect(re.test("HEALO, why is treatment expensive?")).toBe(false);
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

/**
 * 품질 판사 배선 잠금 — 2026-08-31, 반성문 #179 (3차·4차 독립 리뷰).
 *
 * 3차: 이 PR 의 «존재 이유»인 배선(`runJudgeInBackground({ … sessionFacts … })`)을 무는
 *   시험이 하나도 없었다. 그 두 줄을 지워도 1,499건 전부 초록이었다.
 * 4차: 그래서 넣은 소스 정규식 시험이 **새 호출부를 못 봤다** — 들여쓰기가 다르거나
 *   객체를 변수로 넘기면 정규식이 못 잡는데 「«모든» 호출부」라고 이름 붙어 있었다.
 *   세 번째 호출부를 심어 1,505건 전부 초록임을 리뷰어가 실증했다.
 *
 * → **진짜 잠금은 타입이 한다**: `JudgeInput.sessionFacts` 는 선택 필드가 아니라
 *   「키는 필수, 값은 undefined 허용」이라 **호출부가 이 칸을 빠뜨리면 `tsc` 가 막는다.**
 *   아래 시험은 그 타입 계약이 «살아 있는지»와, 조립이 한 곳에서만 되는지를 지킨다
 *   (형태에 기대는 검사는 우회되므로 개수 대조 하나만 남긴다).
 */
describe("judge 배선 잠금 (반성문 #179)", () => {
  const JUDGE_SRC = readFileSync(path.resolve(__dirname, "judge.ts"), "utf8");

  it("🔒 sessionFacts 는 «선택 필드가 아니다» — 이게 풀리면 호출부 누락을 tsc 가 못 잡는다", () => {
    expect(JUDGE_SRC).toMatch(/sessionFacts: string \| undefined;/);
    expect(JUDGE_SRC).not.toMatch(/sessionFacts\?:/);
  });

  it("판사 호출부 «개수»만큼 sessionFacts 가 전달된다", () => {
    // 타입이 이미 막지만, 형태를 바꿔 우회하는 것까지 한 겹 더 본다.
    const calls = (SRC.match(/runJudgeInBackground\(/g) ?? []).length;
    const passed = (SRC.match(/^\s*sessionFacts,\s*$/gm) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(passed).toBe(calls);
  });

  it("안내자료(officialReference)도 호출부 개수만큼 전달된다 (#173 잠금 유지)", () => {
    const calls = (SRC.match(/runJudgeInBackground\(/g) ?? []).length;
    const passed = (SRC.match(/^\s*officialReference: careReference,\s*$/gm) ?? []).length;
    expect(passed).toBe(calls);
  });

  it("세션 사실은 한 곳에서만 조립된다 — 프롬프트용 1 + prepareGeneration 1", () => {
    // 호출부에서 buildSessionFacts 를 «다시» 부르면 시스템 프롬프트가 쓴 것과 어긋날 수 있다.
    expect(SRC).toMatch(/sessionFacts: buildSessionFacts\(session\)/);
    expect(SRC.match(/buildSessionFacts\(session\)/g)?.length).toBe(2);
  });
});
