import { describe, it, expect } from "vitest";
import { readServedModel } from "./servedModel";

describe("readServedModel — 별칭이 실제로 어느 판을 불렀는지", () => {
  it("응답 본문(JSON 객체)의 modelVersion 을 돌려준다", () => {
    expect(readServedModel({ body: { modelVersion: "gemini-3.8-flash" }, modelId: "gemini-flash-latest" }))
      .toBe("gemini-3.8-flash");
  });
  it("본문이 문자열이면 파싱해서 읽는다", () => {
    expect(readServedModel({ body: JSON.stringify({ modelVersion: "gemini-3.7-flash" }) })).toBe("gemini-3.7-flash");
  });
  it("modelVersion 이 없거나 형식이 다르면 null (요청 별칭으로 채우지 않는다)", () => {
    expect(readServedModel({ body: {}, modelId: "gemini-flash-latest" })).toBeNull();
    expect(readServedModel({ body: { modelVersion: 42 } })).toBeNull();
    expect(readServedModel({ body: "not json" })).toBeNull();
    expect(readServedModel(undefined)).toBeNull();
    expect(readServedModel(null)).toBeNull();
  });
});
