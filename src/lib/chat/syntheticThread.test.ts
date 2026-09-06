import { describe, it, expect } from "vitest";
import { isSyntheticThread, syntheticTestFromHeader } from "./syntheticThread";

describe("syntheticTestFromHeader — 헤더 값 정제", () => {
  it("짧은 소문자 토큰만 통과", () => {
    expect(syntheticTestFromHeader("e2e")).toBe("e2e");
    expect(syntheticTestFromHeader(" Smoke ")).toBe("smoke");
    expect(syntheticTestFromHeader("nightly-e2e_1")).toBe("nightly-e2e_1");
  });
  it("없거나 이상하면 null", () => {
    expect(syntheticTestFromHeader(null)).toBeNull();
    expect(syntheticTestFromHeader(undefined)).toBeNull();
    expect(syntheticTestFromHeader("")).toBeNull();
    expect(syntheticTestFromHeader("<script>")).toBeNull();
    expect(syntheticTestFromHeader("a".repeat(40))).toBeNull();
  });
});

describe("isSyntheticThread — 점검·E2E 대화 판정", () => {
  it("smoke-chat.mjs 가 보내는 client_meta.smoke_test=true", () => {
    expect(isSyntheticThread({ client_meta: { smoke_test: true } })).toBe(true);
  });
  it("헤더 경유 synthetic_test 표식", () => {
    expect(isSyntheticThread({ language: "ko", client_meta: { synthetic_test: "e2e" } })).toBe(true);
  });
  it("⭐ 실환자 대화는 절대 아니다 — 비어 있거나 다른 값이면 false", () => {
    expect(isSyntheticThread(null)).toBe(false);
    expect(isSyntheticThread({})).toBe(false);
    expect(isSyntheticThread({ client_meta: null })).toBe(false);
    expect(isSyntheticThread({ client_meta: { smoke_test: "true" } })).toBe(false);
    expect(isSyntheticThread({ client_meta: { synthetic_test: "" } })).toBe(false);
    expect(isSyntheticThread({ client_meta: [] })).toBe(false);
    expect(isSyntheticThread([{ client_meta: { smoke_test: true } }])).toBe(false);
  });
});
