import { describe, it, expect } from "vitest";
import { STT_ENGINES, normalizeSttEngine } from "./sttEngine";

// 이 값은 «클라이언트가 보내는 것»이라 서버가 거르지 않으면 DB 에 아무 문자열이나 들어간다.
// 그러면 이 칸으로 재는 모든 숫자(길별 자막 품질)가 통째로 못 쓰게 된다 — 그래서 시험을 남긴다.
describe("normalizeSttEngine", () => {
  it("아는 값은 그대로 통과시킨다", () => {
    for (const v of Object.values(STT_ENGINES)) {
      expect(normalizeSttEngine(v)).toBe(v);
    }
  });

  it("앞뒤 공백은 다듬는다", () => {
    expect(normalizeSttEngine("  server_gemini \n")).toBe(STT_ENGINES.SERVER);
  });

  it("모르는 값·빈 값·문자열 아닌 것은 전부 null (DB 에 안 들어간다)", () => {
    for (const bad of ["", "  ", "whisper", "SERVER_GEMINI", "server_gemini; drop table", null, undefined, 7, {}, []]) {
      expect(normalizeSttEngine(bad)).toBeNull();
    }
  });
});
