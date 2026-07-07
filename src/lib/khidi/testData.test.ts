import { describe, it, expect } from "vitest";
import {
  isTestEmail,
  isOfficeIp,
  detectInquiryIsTest,
  detectSessionIsTest,
  fetchTestSessionIds,
  findTestPollutedInquiryIds,
  idsToInFilter,
} from "./testData";

describe("isTestEmail", () => {
  it("도메인 일치 시 true (대소문자·공백 무시)", () => {
    expect(isTestEmail("hong@test.com", ["test.com"])).toBe(true);
    expect(isTestEmail("  HONG@TEST.COM ", ["test.com"])).toBe(true);
    expect(isTestEmail("a@staging.test.com", ["staging.test.com"])).toBe(true);
  });
  it("도메인 불일치/빈값은 false", () => {
    expect(isTestEmail("hong@gmail.com", ["test.com"])).toBe(false);
    expect(isTestEmail("hong@nottest.com", ["test.com"])).toBe(false); // 부분일치 방지
    expect(isTestEmail("", ["test.com"])).toBe(false);
    expect(isTestEmail(null, ["test.com"])).toBe(false);
    expect(isTestEmail("noatsign", ["test.com"])).toBe(false);
  });
  it("@ 접두 도메인 표기도 허용", () => {
    expect(isTestEmail("a@test.com", ["@test.com"])).toBe(true);
  });
});

describe("isOfficeIp", () => {
  it("목록에 정확히 있으면 true", () => {
    expect(isOfficeIp("203.0.113.5", ["203.0.113.5"])).toBe(true);
    expect(isOfficeIp(" 203.0.113.5 ", ["203.0.113.5"])).toBe(true);
  });
  it("없거나 빈값이면 false", () => {
    expect(isOfficeIp("198.51.100.1", ["203.0.113.5"])).toBe(false);
    expect(isOfficeIp(null, ["203.0.113.5"])).toBe(false);
    expect(isOfficeIp("203.0.113.5", [])).toBe(false);
  });
});

describe("detectInquiryIsTest", () => {
  const cfg = { officeIps: ["203.0.113.5"], testDomains: ["test.com"] };
  it("수동 도장 우선", () => {
    expect(detectInquiryIsTest({ manual: true, ...cfg })).toBe(true);
  });
  it("사무실 IP 면 true (생성 시점 IP)", () => {
    expect(detectInquiryIsTest({ ip: "203.0.113.5", email: "real@gmail.com", ...cfg })).toBe(true);
  });
  it("테스트 이메일이면 true", () => {
    expect(detectInquiryIsTest({ ip: "1.2.3.4", email: "qa@test.com", ...cfg })).toBe(true);
  });
  it("진짜 환자(외부 IP + 일반 이메일)는 false", () => {
    expect(detectInquiryIsTest({ ip: "95.56.1.2", email: "patient@gmail.com", ...cfg })).toBe(false);
  });
  it("트리거 전부 없으면 false", () => {
    expect(detectInquiryIsTest({ ...cfg })).toBe(false);
  });
  // 로그인 계정 경로(실적 오염 버그): 공유 @test.com 계정으로 폼엔 개인 이메일을 적어도 테스트로 걸러야 함.
  it("계정 이메일이 테스트 도메인이면 폼 이메일이 gmail이어도 true", () => {
    expect(
      detectInquiryIsTest({ ip: "95.56.1.2", email: "patient@gmail.com", accountEmail: "agency@test.com", ...cfg })
    ).toBe(true);
  });
  it("계정 이메일도 폼 이메일도 일반이면 false (진짜 유치 보존)", () => {
    expect(
      detectInquiryIsTest({ ip: "95.56.1.2", email: "patient@gmail.com", accountEmail: "coord@healwith.co.kr", ...cfg })
    ).toBe(false);
  });
  it("게스트(accountEmail 없음)는 폼 이메일 판정 그대로", () => {
    expect(detectInquiryIsTest({ email: "qa@test.com", accountEmail: null, ...cfg })).toBe(true);
    expect(detectInquiryIsTest({ email: "patient@gmail.com", accountEmail: undefined, ...cfg })).toBe(false);
  });
});

describe("detectSessionIsTest (K-02 세션 생성시점 도장)", () => {
  it("명시 지정이면 true", () => {
    expect(detectSessionIsTest({ manual: true })).toBe(true);
  });
  it("연결 inquiry 가 테스트면 상속해 true", () => {
    expect(detectSessionIsTest({ inquiryIsTest: true })).toBe(true);
  });
  it("notes 에 [TEST] 마커(대소문자 무관)면 true", () => {
    expect(detectSessionIsTest({ notes: "월요일 [TEST] 방" })).toBe(true);
    expect(detectSessionIsTest({ notes: "smoke [test] run" })).toBe(true);
  });
  it("트리거 없으면 false (inquiry 미연결 실세션 포함)", () => {
    expect(detectSessionIsTest({})).toBe(false);
    expect(detectSessionIsTest({ inquiryIsTest: null, notes: "실환자 카자흐 상담" })).toBe(false);
    expect(detectSessionIsTest({ inquiryIsTest: false, notes: null, manual: false })).toBe(false);
  });
});

describe("fetchTestSessionIds (세션 표식 ∪ inquiry 체인 합집합)", () => {
  // 최소 가짜 db: from(table).select().eq()/.in() 체이닝만 흉내
  function fakeDb(opts: {
    flaggedSessionIds: string[];
    testInquiryIds: number[];
    chainSessionIds: string[];
  }) {
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq: async (col: string, _v: unknown) => {
                if (table === "consultation_sessions" && col === "is_test") {
                  return { data: opts.flaggedSessionIds.map((id) => ({ id })), error: null };
                }
                if (table === "inquiries" && col === "is_test") {
                  return { data: opts.testInquiryIds.map((id) => ({ id })), error: null };
                }
                return { data: [], error: null };
              },
              in: async (_col: string, _ids: unknown) => ({
                data: opts.chainSessionIds.map((id) => ({ id })),
                error: null,
              }),
            };
          },
        };
      },
    };
  }

  it("세션 자체 표식만 있는 것(inquiry 미연결 테스트)도 포함된다 — K-02 오염 벡터", async () => {
    const db = fakeDb({
      flaggedSessionIds: ["s-noinq-1"],
      testInquiryIds: [],
      chainSessionIds: [],
    });
    expect(await fetchTestSessionIds(db)).toEqual(["s-noinq-1"]);
  });

  it("표식과 체인이 겹치면 중복 없이 합쳐진다", async () => {
    const db = fakeDb({
      flaggedSessionIds: ["s-1", "s-2"],
      testInquiryIds: [7],
      chainSessionIds: ["s-2", "s-3"],
    });
    const ids = (await fetchTestSessionIds(db)).sort();
    expect(ids).toEqual(["s-1", "s-2", "s-3"]);
  });

  it("둘 다 비면 빈 배열", async () => {
    const db = fakeDb({ flaggedSessionIds: [], testInquiryIds: [], chainSessionIds: [] });
    expect(await fetchTestSessionIds(db)).toEqual([]);
  });
});

describe("findTestPollutedInquiryIds (드리프트 감사)", () => {
  const domains = ["test.com"];
  it("계정이 테스트 도메인인 행만 골라낸다", () => {
    const rows = [
      { id: 37, accountEmail: "agency@test.com" },
      { id: 40, accountEmail: "real-patient@gmail.com" },
      { id: 19, accountEmail: "coordinator@test.com" },
      { id: 41, accountEmail: null },
    ];
    expect(findTestPollutedInquiryIds(rows, domains).sort((a, b) => a - b)).toEqual([19, 37]);
  });
  it("오염 없으면 빈 배열", () => {
    expect(findTestPollutedInquiryIds([{ id: 1, accountEmail: "a@gmail.com" }], domains)).toEqual([]);
  });
});

describe("idsToInFilter", () => {
  it("숫자 id 는 따옴표 없이", () => {
    expect(idsToInFilter([1, 2, 3])).toBe("(1,2,3)");
  });
  it("문자열(uuid) id 는 따옴표로", () => {
    expect(idsToInFilter(["a1", "b2"])).toBe('("a1","b2")');
  });
  it("빈 배열은 null", () => {
    expect(idsToInFilter([])).toBe(null);
  });
});
