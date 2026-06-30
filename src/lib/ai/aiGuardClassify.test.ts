import { describe, it, expect } from "vitest";
import { classifyIpRisk, intrusionFactor } from "./aiGuardClassify";

describe("classifyIpRisk — IP 일일 호출수 3단계 (감지 우선)", () => {
  const soft = 50;
  const hard = 400;
  it("normal: soft 미만", () => {
    expect(classifyIpRisk(0, soft, hard)).toBe("normal");
    expect(classifyIpRisk(49, soft, hard)).toBe("normal");
  });
  it("elevated: soft 도달~soft*3 미만 (관측, 차단 안 함)", () => {
    expect(classifyIpRisk(50, soft, hard)).toBe("elevated");
    expect(classifyIpRisk(149, soft, hard)).toBe("elevated");
  });
  it("likely_intrusion: soft*3 도달~hard 미만 (알림 강화, 아직 허용)", () => {
    expect(classifyIpRisk(150, soft, hard)).toBe("likely_intrusion");
    expect(classifyIpRisk(399, soft, hard)).toBe("likely_intrusion");
  });
  it("intrusion: hard 도달 (자동 차단)", () => {
    expect(classifyIpRisk(400, soft, hard)).toBe("intrusion");
    expect(classifyIpRisk(5000, soft, hard)).toBe("intrusion");
  });
  it("soft*3 가 hard 를 넘으면 intrusion 이 먼저 (경계 역전 방지)", () => {
    // soft=200, hard=400 → soft*3=600>hard. 400 은 바로 intrusion 이어야.
    expect(classifyIpRisk(400, 200, 400)).toBe("intrusion");
    expect(classifyIpRisk(250, 200, 400)).toBe("elevated"); // soft*3(600) 안 넘음 → elevated
  });
});

describe("intrusionFactor", () => {
  it("soft 대비 배수", () => {
    expect(intrusionFactor(150, 50)).toBe(3);
    expect(intrusionFactor(75, 50)).toBe(1.5);
    expect(intrusionFactor(100, 0)).toBe(0); // soft 0 방어
  });
});
