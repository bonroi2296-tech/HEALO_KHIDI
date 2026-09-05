import { describe, it, expect } from "vitest";
import { toInternalPath } from "./deepLinks";

describe("앱 링크 주소 → 우리 사이트 안 경로", () => {
  it("우리 주소는 경로만 뽑는다", () => {
    expect(toInternalPath("https://healwith.co.kr/ko/hospitals")).toBe("/ko/hospitals");
    expect(toInternalPath("https://www.healwith.co.kr/c/abc123")).toBe("/c/abc123");
    expect(toInternalPath("https://healwith.co.kr/auth/callback?code=x#y")).toBe("/auth/callback?code=x#y");
  });

  it("핵심 잠금: 남의 호스트는 절대 안 따라간다", () => {
    expect(toInternalPath("https://evil.com/ko")).toBeNull();
    expect(toInternalPath("https://healwith.co.kr.evil.com/ko")).toBeNull();
    expect(toInternalPath("javascript:alert(1)")).toBeNull();
  });

  it("도메인만·빈 값이면 옮기지 않는다", () => {
    expect(toInternalPath("https://healwith.co.kr/")).toBeNull();
    expect(toInternalPath("")).toBeNull();
    expect(toInternalPath(null)).toBeNull();
    expect(toInternalPath("그냥문자열")).toBeNull();
  });
});
