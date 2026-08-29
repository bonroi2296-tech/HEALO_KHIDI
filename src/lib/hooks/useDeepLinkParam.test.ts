import { describe, it, expect } from "vitest";
import { SAFE_ID, NUMERIC_ID } from "./useDeepLinkParam";

// 훅 자체(React)는 화면 시험에서 보고, 여기선 «값을 거르는 자» 를 잰다.
// 이게 뚫리면 관리자 토큰으로 엉뚱한 API 를 부르게 된다(2026-08-28 독립 리뷰 지적).
describe("딥링크 값 거르기", () => {
  it("정상 id 는 통과", () => {
    expect(SAFE_ID.test("ab869ad9-1111-2222-3333-444455556666")).toBe(true);
    expect(SAFE_ID.test("412")).toBe(true);
    expect(NUMERIC_ID.test("412")).toBe(true);
  });

  it("경로 타고 올라가는 값은 막는다", () => {
    expect(SAFE_ID.test("../../users")).toBe(false);
    expect(SAFE_ID.test("..%2F..%2Fusers")).toBe(false);
    expect(SAFE_ID.test("a/b")).toBe(false);
    expect(SAFE_ID.test("../")).toBe(false);
  });

  it("쿼리·해시·공백이 섞인 값도 막는다", () => {
    expect(SAFE_ID.test("1?x=2")).toBe(false);
    expect(SAFE_ID.test("1#frag")).toBe(false);
    expect(SAFE_ID.test("a b")).toBe(false);
    expect(SAFE_ID.test("")).toBe(false);
  });

  it("문의 번호 자리에 숫자 아닌 것은 막는다", () => {
    expect(NUMERIC_ID.test("abc")).toBe(false);
    expect(NUMERIC_ID.test("12a")).toBe(false);
    expect(NUMERIC_ID.test("-1")).toBe(false);
  });

  it("너무 긴 값은 막는다 (주소 폭탄)", () => {
    expect(SAFE_ID.test("a".repeat(65))).toBe(false);
    expect(SAFE_ID.test("a".repeat(64))).toBe(true);
  });
});
