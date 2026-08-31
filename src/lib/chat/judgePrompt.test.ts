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
import { buildRegressionJudgeMessage, REGRESSION_DOC_LIST_ALLOWED } from "./regressionRunner";
import { buildSystemPrompt, buildSessionFacts } from "./generateReply";

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

  it("축약판 턴 프롬프트엔 «자료의 금액»이 한 푼도 안 새어 나온다 (예시 숫자로도 안 된다)", () => {
    const p = buildJudgePrompt({
      query: "회복에 도움되는 게 있나요?",
      response: "면력한방병원에서 보조 케어를 받으실 수 있습니다.",
      lang: "ko",
      officialReference: CARE_REFERENCE_MINIMAL,
    });
    // 자료에 실제로 있는 «돈 표기»를 전부 뽑아, 그중 하나라도 프롬프트에 나오면 실패.
    // ⚠️ 「$ 붙은 것만」 보면 안 된다 — 자료는 범위 윗값에 $ 를 안 붙인다($6,000–18,500).
    //    그래서 「6,000~18,500」 으로 되돌려 넣어도 안 걸리던 구멍이 있었다(리뷰 3차 실증).
    // 판사 지시문의 «예시 금액»으로도 진짜 값을 쓰면 안 된다 — 대화기록에서 되받아 쓴 가격을
    // 판사가 「자료에 있네」로 봐줄 근거가 생긴다(#625 검출이 헐거워진다).
    const moneyInReference = [
      ...new Set(CARE_REFERENCE.match(/\d{1,3}(?:,\d{3})+|₩\d+M/g) ?? []),
    ].filter((t) => t !== "1,350"); // 환율 설명값(1 USD ≈ 1,350 KRW)은 금액이 아니다
    expect(moneyInReference.length).toBeGreaterThan(5); // 뽑기 자체가 망가지면 여기서 터진다
    const leaked = moneyInReference.filter((t) => p.includes(t));
    expect(leaked).toEqual([]);
  });
});

describe("자가시험 판사(regressionRunner)도 같은 자료를 본다", () => {
  const msg = buildRegressionJudgeMessage(
    "위암 수술 얼마나 드나요?",
    "담당 코디네이터가 안내해 드립니다.",
    "가격 범위 안내",
    "ko",
  );

  it("판사 메시지에 [Reference] 칸이 있고 자료 금액이 들어 있다", () => {
    expect(msg).toContain("[Reference]");
    expect(msg).toContain("$6,000");    // 위암 범위
    expect(msg).toContain("$7,500");    // 대장암 범위
    expect(msg).toContain("Mistletoe"); // 면역치료 블록
  });

  it("응시자(응답 생성)와 채점자가 같은 판을 본다 — 양쪽 다 확인", () => {
    // 자가시험은 서류·비용 질문을 그대로 던지므로 전체판(가격 포함)이어야 한다.
    // 채점자 쪽
    expect(msg).toContain(CARE_REFERENCE);
    // 응시자 쪽 — regressionRunner.generateReply 가 부르는 그 인자 그대로.
    // 한쪽만 검사하면 응시자 인자를 false 로 바꿔도 시험이 초록으로 남는다(리뷰 3차 실증).
    const system = buildSystemPrompt("", false, false, [], {}, true, {}, "en", REGRESSION_DOC_LIST_ALLOWED);
    expect(system).toContain(CARE_REFERENCE);
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

/**
 * 세션 상태 사실 회귀 잠금 — 2026-08-31, 반성문 #179.
 *
 * 사고: #173 과 «같은 자»가 하나 더 비어 있었다. 로그인 여부·게스트 30일 자동 재개·첨부
 *   못 읽음 같은 사실은 RAG 컨텍스트에도 안내자료에도 없고 시스템 프롬프트에만 있는데,
 *   판사는 그 두 칸만 봤다 → 모델이 프롬프트대로 «정확히» 답해도 hallucination 으로 찍혔다.
 *   실측: 60일간 hallucination 53건 중 32건(60%)이 «로그인 안 했는데 저장돼?» 한 케이스로,
 *   7/02~8/30 매일 1건씩 연속 오판. 30일 재개는 실제 구현이다(ThreadChat.jsx COOKIE_MAX_AGE=30일).
 *   2026-08-28 부터 hallucination 이 ALERT_ALWAYS_FLAGS 라 매일 코디에게 가짜 경보까지 나갔다.
 *
 * ⚠️ #173 과 같은 함정: 응답 문자열에 「30일」을 넣으면 «응답 때문에» 통과한다.
 *   그래서 아래 응답에는 30일도 로그인도 안 쓰고, 검사는 SESSION FACTS 칸만 떼어내서 본다.
 */
describe("판사가 세션 상태 사실을 본다 (반성문 #179)", () => {
  /** 사실 칸만 떼어낸다 — 응답·질문 때문에 통과하는 걸 막는다. */
  function sessionBlock(prompt: string): string {
    const i = prompt.indexOf("[SESSION FACTS");
    if (i < 0) return "";
    const j = prompt.indexOf("[AI 응답]", i);
    return prompt.slice(i, j < 0 ? undefined : j);
  }

  /** 사실이 하나도 안 들어간 응답 — 통과가 «사실 주입 때문»이어야 한다. */
  const neutral = {
    query: "나 로그인 안 했는데 이거 저장돼? 창 닫으면 사라져?",
    response: "코디네이터가 이어서 안내해 드리겠습니다.",
    lang: "ko",
  };

  it("게스트 사실을 넘기면 판사 프롬프트에 30일 재개가 들어간다", () => {
    const block = sessionBlock(
      buildJudgePrompt({ ...neutral, sessionFacts: buildSessionFacts({ isLoggedIn: false }) }),
    );
    expect(block).toContain("30 days");
    expect(block).toContain("GUEST");
  });

  it("로그인 상태는 «다른» 사실이 들어간다 — 두 경우가 안 섞인다", () => {
    const block = sessionBlock(
      buildJudgePrompt({ ...neutral, sessionFacts: buildSessionFacts({ isLoggedIn: true }) }),
    );
    expect(block).toContain("LOGGED IN");
    expect(block).not.toContain("30 days");
  });

  it("첨부가 있으면 «못 읽는다»는 사실도 판사가 본다", () => {
    const block = sessionBlock(
      buildJudgePrompt({ ...neutral, sessionFacts: buildSessionFacts({ hasAttachments: true }) }),
    );
    expect(block).toMatch(/CANNOT open, see, or read/);
  });

  it("응시자(시스템 프롬프트)와 채점자가 «같은 문자열»을 본다", () => {
    // 이게 이 시험의 핵심이다. 한쪽만 검사하면 프롬프트에 사실을 직접 써넣어도 초록으로 남고,
    // 그 순간 판사는 그 사실을 못 봐서 #179 가 그대로 재발한다.
    for (const session of [{ isLoggedIn: false }, { isLoggedIn: true }]) {
      const facts = buildSessionFacts(session);
      expect(facts.length).toBeGreaterThan(50);
      // 채점자 쪽
      expect(sessionBlock(buildJudgePrompt({ ...neutral, sessionFacts: facts }))).toContain(facts);
      // 응시자 쪽 — buildSystemPrompt 가 같은 함수를 쓰는지.
      expect(buildSystemPrompt("", false, false, [], {}, true, session, "ko")).toContain(facts);
    }
  });

  it("컨텍스트·안내자료가 아무리 길어도 세션 사실을 밀어내지 않는다 (칸을 따로 쓴다)", () => {
    const block = sessionBlock(
      buildJudgePrompt({
        ...neutral,
        context: "가".repeat(50_000),
        officialReference: CARE_REFERENCE,
        sessionFacts: buildSessionFacts({ isLoggedIn: false }),
      }),
    );
    expect(block).toContain("30 days");
  });

  it("사실을 안 넘긴 호출은 칸 자체가 없다 (기존 동작 보존)", () => {
    expect(buildJudgePrompt(neutral)).not.toContain("[SESSION FACTS");
  });

  /**
   * ⚠️ 이 블록이 «행동을 바꾸는» 부분을 잠근다.
   *
   * 처음 낸 판에서는 이 자리를 `toContain("SESSION FACTS")` + `/환각이 아니다/` 로만 봤는데,
   * 둘 다 **이 PR 이전부터 있던 다른 문장에 이미 있는 말**이라 규칙 문단을 통째로 지워도
   * 19건이 전부 초록이었다(독립 리뷰가 실제로 지워서 실증했다).
   * → 규칙 문단의 **각 조항을 따로** 대조한다. 조항을 지우면 해당 줄이 터진다.
   */
  describe("판사 규칙 문단 — 조항별로 잠근다", () => {
    const prompt = buildJudgePrompt({ ...neutral, sessionFacts: buildSessionFacts({}) });

    it("① 「이 칸도 컨텍스트다」 선언", () => {
      expect(prompt).toContain("RETRIEVED CONTEXT · OFFICIAL REFERENCE · SESSION FACTS 셋 다다");
      expect(prompt).toContain("【SESSION FACTS 칸에 대하여】");
    });

    it("② 보관·재개 기간이 칸과 같으면 사실이라는 봐주기", () => {
      expect(prompt).toMatch(/대화 보관·재개 기간을 응답이[\s\S]{0,40}이 칸에 적힌 것과 같으면 사실/);
    });

    it("③ 봐주기의 «범위 제한» — 의료·체류·일정 주장엔 안 통한다", () => {
      // 이 조항이 없으면 「30일」 같은 숫자가 토큰 단위로 통과해
      // "비자로 30일 체류 가능" 류의 지어낸 주장까지 봐주게 된다(독립 리뷰 지적).
      expect(prompt).toContain("의료·체류·일정에 관한");
      expect(prompt).toMatch(/이 칸이 근거가 못 된다/);
    });

    it("④ 역방향 규칙 — 칸과 어긋나게 말하면 여전히 환각이다", () => {
      expect(prompt).toMatch(/이 칸과 «어긋나게» 말했다면 그건 환각이다/);
      expect(prompt).toContain("어느 기기에서나 열린다");
      expect(prompt).toMatch(/쿠키·기기·기간 제한을 지어내거나/);
      expect(prompt).toContain("첨부파일 내용을 읽은 것처럼");
    });

    it("④-1 역방향 규칙은 «이 칸에 적힌 것»으로만 판정한다 — 칸에 없는 축을 끌어오지 마라", () => {
      // 역방향 예시가 웹(브라우저·기기) 모양이라, 메신저처럼 칸이 기기 얘기를 안 하는
      // 경우에 «참인 답»을 환각으로 찍을 수 있었다 — 이 PR 이 없애려던 오탐의 축소판
      // (2차 독립 리뷰 지적). 조건을 명시해 그 경로를 막는다.
      expect(prompt).toMatch(/판정 기준은 «이 칸에 적힌 것»뿐이다/);
      expect(prompt).toMatch(/칸이 기기 얘기를 아예 안 하면/);
    });

    it("⑤ 돈 판정의 근거는 «두 칸»이라고 못 박는다 (칸이 셋이 되며 지시대상이 깨졌던 자리)", () => {
      // 「위 두 칸」이라고만 쓰여 있던 때는, 새 칸이 끼어들며 그 «두 칸»이
      // SESSION FACTS + OFFICIAL REFERENCE 로 읽힐 수 있었다 → RAG 에만 있던 진짜 금액이
      // fabricated_price 로 오탐될 수 있었다(#173 이 고친 부류의 재발 경로).
      expect(prompt).toContain("**RETRIEVED CONTEXT 와 OFFICIAL REFERENCE 두 칸**");
      expect(prompt).toMatch(/SESSION FACTS 엔 금액이 없다/);
      expect(prompt).not.toContain("거꾸로, 위 두 칸에");
    });
  });

  /**
   * 채널 분리 — 텔레그램·왓츠앱엔 브라우저도 쿠키도 없다.
   * 나누지 않으면 «없는 기능»을 약속하고, 이 PR 이 그 거짓말을 판사에게 「사실」로 넘겨
   * 환각 검출까지 통과시킨다(독립 리뷰가 잡은 결함 1).
   */
  describe("메신저 채널엔 쿠키·30일을 사실로 주지 않는다", () => {
    it("메신저 게스트 사실엔 30일도 쿠키도 브라우저도 없다", () => {
      const facts = buildSessionFacts({ isLoggedIn: false, channel: "messenger" });
      expect(facts).not.toMatch(/30 days/);
      expect(facts).not.toMatch(/cookie/i);
      expect(facts).not.toMatch(/browser/i);
      // 대신 «이 대화창이 곧 스레드»라는 참인 사실이 들어간다.
      expect(facts).toContain("messenger conversation IS the thread");
    });

    it("웹 게스트는 그대로 30일 쿠키 재개다 (기본값이 web)", () => {
      expect(buildSessionFacts({ isLoggedIn: false })).toContain("30 days");
      expect(buildSessionFacts({ isLoggedIn: false, channel: "web" })).toContain("30 days");
    });

    it("🔴 «모르는» 채널 값은 거짓말 쪽으로 안 떨어진다 — 안전한 쪽으로 간다", () => {
      // DB `chat_threads.channel` 값은 web|whatsapp|telegram|email|line 이다.
      // 다음 사람이 `channel: thread.channel` 로 넘기면 "telegram" 이 들어오는데,
      // Supabase 결과는 any 라 타입이 안 막는다. 그때 미지의 값이 «쿠키 안내» 쪽으로
      // 떨어지면 그게 곧 거짓말이다 → 분기를 «web 일 때만»으로 «긍정» 판정해야 한다.
      // (분기를 `!== "messenger"` 로 되돌리면 이 시험이 터진다 — 3차 리뷰 지적.)
      // ⚠️ undefined(=칸 자체를 안 넘김)는 «모르는 값»이 아니라 웹 위젯의 정상 기본값이다
      //    — 바로 아래·위 시험이 그쪽을 따로 잠근다. 여기서 재는 건 «잘못 채워진 값»이다.
      for (const v of ["telegram", "whatsapp", "email", "line", "", null]) {
        const facts = buildSessionFacts({ isLoggedIn: false, channel: v as any });
        expect(facts, `channel=${String(v)}`).not.toMatch(/30 days/);
        expect(facts, `channel=${String(v)}`).not.toMatch(/cookie/i);
      }
    });

    it("연락처가 없으면 «코디가 연락처로 후속한다»를 사실로 주지 않는다", () => {
      // 이 문장이 무조건이던 때는, 연락처가 하나도 없는 게스트에게 모델이
      // "코디가 연락드리겠습니다"라고 답해도 판사가 「칸에 있으니 사실」로 통과시켰다
      // — 2026-06-22 실제 컴플레인이 났던 거짓 약속이다(3차 리뷰 지적).
      const noContact = buildSessionFacts({ isLoggedIn: false });
      expect(noContact).toMatch(/NO way to reach this patient/);
      expect(noContact).not.toMatch(/contact detail already on file/);

      const onFile = buildSessionFacts({ isLoggedIn: false, hasReachableContact: true });
      expect(onFile).toMatch(/contact detail already on file/);

      const here = buildSessionFacts({ isLoggedIn: false, contactInThisChannel: true });
      expect(here).toMatch(/follows up IN THIS SAME chat/);
    });

    it("메신저에서도 판사가 같은 문자열을 본다", () => {
      const facts = buildSessionFacts({ channel: "messenger" });
      expect(sessionBlock(buildJudgePrompt({ ...neutral, sessionFacts: facts }))).toContain(facts);
      expect(buildSystemPrompt("", false, false, [], {}, true, { channel: "messenger" }, "ko")).toContain(facts);
    });

    it("시스템 프롬프트가 «칸에 없는» 기기·쿠키·기간을 덧붙이지 말라고 지시한다", () => {
      // 사실 칸을 채널별로 나눠도, 프롬프트의 다른 줄이 「이 기기에서 다시 열린다」고
      // 덧붙이면 메신저에서 도로 거짓말이 된다(원래 그렇게 적혀 있었다).
      const sys = buildSystemPrompt("", false, false, [], {}, true, { channel: "messenger" }, "ko");
      expect(sys).toMatch(/do not add a device, browser, cookie or time limit that is not written there/);
    });
  });
});
