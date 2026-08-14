import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "./allowedOrigin";

const prod = { isProduction: true };
const dev = { isProduction: false };

describe("isAllowedOrigin", () => {
  it("우리 도메인은 실서비스에서도 통과", () => {
    for (const o of [
      "https://healwith.co.kr",
      "https://www.healwith.co.kr",
      "https://khidi.healo.kr",
    ]) {
      expect(isAllowedOrigin(o, prod), o).toBe(true);
    }
  });

  it("남의(또는 우리) vercel.app 은 실서비스에서 막는다 — CSRF 방지 (2026-08-14)", () => {
    // vercel.app 서브도메인은 누구나 선점 가능 → 접미사 허용은 CSRF 문을 연다.
    for (const o of [
      "https://evil.vercel.app",
      "https://healo-abc.vercel.app",
      "https://healo-khidi-xyz.vercel.app",
    ]) {
      expect(isAllowedOrigin(o, prod), o).toBe(false);
    }
  });

  it("실서비스에서는 localhost 를 막는다 (예전 동작 유지)", () => {
    expect(isAllowedOrigin("http://localhost:3000", prod)).toBe(false);
    expect(isAllowedOrigin("http://127.0.0.1:3241", prod)).toBe(false);
  });

  it("개발에서는 localhost 의 아무 포트나 통과 — 이게 이번에 고친 것", () => {
    for (const o of [
      "http://localhost:3000",
      "http://localhost:3241",
      "http://localhost:3251",
      "http://127.0.0.1:3097",
    ]) {
      expect(isAllowedOrigin(o, dev), o).toBe(true);
    }
  });

  it("남의 사이트는 개발에서도 막는다", () => {
    for (const o of [
      "https://evil.com",
      "https://healwith.co.kr.evil.com",
      "https://notlocalhost",
      "http://localhost.evil.com",
    ]) {
      expect(isAllowedOrigin(o, dev), o).toBe(false);
    }
  });

  it("빈 값·깨진 값은 막는다", () => {
    for (const o of [null, undefined, "", "   ", "not a url", "javascript:alert(1)"]) {
      expect(isAllowedOrigin(o as any, dev), String(o)).toBe(false);
    }
  });
});
