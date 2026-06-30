import { describe, it, expect } from "vitest";
import {
  isTestEmail,
  isOfficeIp,
  detectInquiryIsTest,
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
