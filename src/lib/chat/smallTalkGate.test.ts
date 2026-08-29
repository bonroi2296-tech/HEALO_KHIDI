/**
 * 잡담 우회 게이트 + 품질 알림 게이트 회귀 시험
 *
 * 계기 (2026-08-28 PO 제보, 스레드 #30bfcc04 — 실제 환자 대화):
 *   ① AI 가 "코디네이터 연결을 도와드릴까요?" 라고 물은 «직후» 환자가 "그래"(2자)라고 답했는데
 *      3자 이하 규칙에 걸려 모델을 거치지도 않고 고정문구가 나갔다. 한 스레드에서 4번 반복,
 *      그중 3번이 «연결 동의»와 «연락처 제공 동의» 자리였다.
 *   ② 판사가 hallucination 을 찍었는데 종합점수 0.80·0.84 라 알림 문턱(0.6)을 넘어 무알림.
 *      전수 265건 중 235건이 같은 구멍으로 샜다.
 *
 * 아래 케이스는 그 대화의 «실제 문자열» 그대로다 — 지어낸 예시로 바꾸지 마라.
 */
import { describe, it, expect } from "vitest";
import { isSmallTalk } from "./generateReply";
import { hasAlertAlwaysFlag } from "./qualityStandards";

type M = { role: "user" | "assistant" | "system"; content: string };

const asked = (q: string): M[] => [
  { role: "user", content: "외국인도 가능해요" },
  { role: "assistant", content: q },
];

describe("isSmallTalk — 직전에 우리가 물었으면 짧은 답도 «답»이다", () => {
  const QUESTION = "네, 외국인 환자분도 얼마든지 진료와 치료가 가능합니다.\n\n편하게 진료받으실 수 있도록 코디네이터 연결을 도와드릴까요?";

  it("연결 동의('그래'·'네')를 잡담으로 삼키지 않는다 — 실제 유실 지점", () => {
    for (const answer of ["그래", "네", "응", "예", "ok", "yes"]) {
      expect(isSmallTalk(answer, asked(QUESTION))).toBe(false);
    }
  });

  it("연락처를 달라고 물은 직후의 '네'도 삼키지 않는다", () => {
    const contactAsk = "코디네이터가 빠른 진료 일정을 잡고 안내해 드릴 수 있도록, 연락받으실 이메일이나 메신저 ID(카카오톡/왓츠앱 등)를 남겨주시겠어요?";
    expect(isSmallTalk("네", asked(contactAsk))).toBe(false);
  });

  it("전각 물음표(중국어·일본어 답변)도 질문으로 인정", () => {
    expect(isSmallTalk("好", asked("需要我为您联系协调员吗？"))).toBe(false);
  });

  // 주 고객이 러·CIS 라 여기가 한국어보다 중요하다. 실측(2026-08-28): "да"(2자)·"иә"(2자)·
  // "好"·"はい" 전부 3자 이하 규칙에 걸려 한국어 "그래"와 «똑같이» 씹히고 있었다.
  it("러시아어·카자흐어·중국어·일본어의 짧은 동의도 삼키지 않는다", () => {
    const ru = "Хотите, я свяжу вас с координатором?";
    for (const yes of ["да", "Да", "ок"]) expect(isSmallTalk(yes, asked(ru))).toBe(false);

    const kk = "Сізді үйлестірушімен байланыстырайын ба?";
    expect(isSmallTalk("иә", asked(kk))).toBe(false);

    expect(isSmallTalk("はい", asked("コーディネーターにおつなぎしましょうか？"))).toBe(false);
  });

  // 실측(chat_messages 524건): 물음표가 있는 AI 답변 286건 중 «끝»에 있는 건 174건(61%)뿐.
  // 나머지는 우리 프롬프트가 시킨 「질문? + 알려주시면 안내하겠습니다」 형태다.
  // 아래 두 문자열은 실DB 원문 그대로 — 지어낸 예시로 바꾸지 마라.
  it("물음표 뒤에 맺음말이 붙어도 «대답 기다리는 중»으로 본다 — 실DB 원문", () => {
    const withTail = "현재 앓고 계신 다른 질환이나 최근 진단받으신 내용이 있으신가요? 상황을 조금 더 알려주시면 적합한 진료 연계를 도와드리겠습니다.";
    expect(isSmallTalk("네", asked(withTail))).toBe(false);

    const withTail2 = "혹은 두통과 함께 어지럼증이나 다른 증상이 동반되는지 말씀해 주실 수 있나요? \n\n상태를 조금 더 알려주시면 적합한 전문 병원과 의료진으로 안내해 드리겠습니다.";
    expect(isSmallTalk("응", asked(withTail2))).toBe(false);
  });

  it("물음표가 답변 «앞쪽 멀리»에만 있으면 잡담 처리 — 과확장 방지", () => {
    const farAway = "무엇을 도와드릴까요? " + "코디네이터가 병원 예약과 통역, 일정 관리까지 전 과정을 함께 준비해 드립니다. ".repeat(2);
    expect(isSmallTalk("네", asked(farAway))).toBe(true);
  });

  it("직전 답변이 질문이 아니면 종전대로 잡담 처리 — 기존 동작 보존", () => {
    const statement = "더 자세히 말씀해 주시면 적합한 한국 병원을 찾아드릴게요.";
    expect(isSmallTalk("네", asked(statement))).toBe(true);
    // "안녕"은 단독일 때만 인사 규칙에 걸린다("안녕하세요"는 원래부터 잡담 아님).
    expect(isSmallTalk("안녕", asked(statement))).toBe(true);
  });

  it("대화 맥락이 없으면(첫 메시지) 종전대로 잡담 처리", () => {
    expect(isSmallTalk("안녕")).toBe(true);
    expect(isSmallTalk("네", [])).toBe(true);
  });

  it("질문 뒤라도 «긴 실질 질문»은 원래부터 잡담이 아니다", () => {
    expect(isSmallTalk("돈 안비싸요?", asked(QUESTION))).toBe(false);
    expect(isSmallTalk("연결해줘요", asked(QUESTION))).toBe(false);
  });

  it("사이에 환자 발화가 끼어도 «가장 최근» 어시스턴트 발화로 판정한다", () => {
    const history: M[] = [
      { role: "assistant", content: "안내해 드리겠습니다." },
      { role: "user", content: "외국인도 가능해요" },
      { role: "assistant", content: QUESTION },
      { role: "user", content: "그래" },
    ];
    expect(isSmallTalk("그래", history)).toBe(false);
  });
});

describe("hasAlertAlwaysFlag — 점수와 무관하게 알려야 할 표시", () => {
  it("환각·날조는 점수가 높아도 알림 대상", () => {
    expect(hasAlertAlwaysFlag(["hallucination"])).toBe(true);
    expect(hasAlertAlwaysFlag(["fabricated_price"])).toBe(true);
    expect(hasAlertAlwaysFlag(["fabricated_hospital"])).toBe(true);
  });

  it("의료 레드라인도 알림 대상", () => {
    expect(hasAlertAlwaysFlag(["cure_claim"])).toBe(true);
    expect(hasAlertAlwaysFlag(["medical_diagnosis"])).toBe(true);
  });

  it("톤·범위 문제(off_topic·overclaim_stat)만 있으면 알리지 않는다 — 알림 피로도", () => {
    expect(hasAlertAlwaysFlag(["off_topic"])).toBe(false);
    expect(hasAlertAlwaysFlag(["overclaim_stat"])).toBe(false);
  });

  it("표시가 없거나 값이 비어도 안전하게 false", () => {
    expect(hasAlertAlwaysFlag([])).toBe(false);
    expect(hasAlertAlwaysFlag(null)).toBe(false);
    expect(hasAlertAlwaysFlag(undefined)).toBe(false);
  });

  it("섞여 있으면 하나라도 대상이면 알린다", () => {
    expect(hasAlertAlwaysFlag(["off_topic", "hallucination"])).toBe(true);
  });
});
