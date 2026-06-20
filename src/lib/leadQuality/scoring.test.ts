import { describe, it, expect } from "vitest";
import { evaluateLeadQuality } from "./scoring";

describe("evaluateLeadQuality", () => {
  it("빈 입력 → 중립(기본 40점, cold 등급), 결정적", () => {
    const a = evaluateLeadQuality({});
    const b = evaluateLeadQuality({});
    expect(a).toEqual(b); // 결정적
    expect(a.priorityScore).toBe(40);
    expect(a.quality).toBe("cold");
  });

  it("우수 리드(타깃국가+완성+상세) → 점수 상승·hot 쪽, priorityScore 0~100 클램프", () => {
    const strong = evaluateLeadQuality({
      country: "KZ",
      treatmentType: "oncology",
      messageLength: 400,
      missingFieldsCount: 0,
      intakeCompleteness: 0.9,
    });
    const weak = evaluateLeadQuality({ messageLength: 10, missingFieldsCount: 5 });
    expect(strong.priorityScore).toBeGreaterThan(weak.priorityScore);
    expect(strong.priorityScore).toBeLessThanOrEqual(100);
    expect(strong.priorityScore).toBeGreaterThanOrEqual(0);
    expect(["hot", "warm"]).toContain(strong.quality);
  });

  it("의심 이메일 도메인 → 감점 + suspicious-email 태그", () => {
    const r = evaluateLeadQuality({ emailDomain: "foo.mailinator.com" });
    expect(r.tags).toContain("suspicious-email");
    expect(r.priorityScore).toBeLessThan(40);
  });

  it("priorityScore는 항상 0~100, tags/signals는 중복 없음", () => {
    const samples = [
      {},
      { country: "RU", missingFieldsCount: 0, messageLength: 300, intakeCompleteness: 1 },
      { emailDomain: "x.tempmail.io", messageLength: 5, missingFieldsCount: 9 },
      { country: "ZZ", treatmentType: "unknown" },
    ];
    for (const s of samples) {
      const r = evaluateLeadQuality(s);
      expect(r.priorityScore).toBeGreaterThanOrEqual(0);
      expect(r.priorityScore).toBeLessThanOrEqual(100);
      expect(new Set(r.tags).size).toBe(r.tags.length);
      expect(new Set(r.signals).size).toBe(r.signals.length);
      expect(["hot", "warm", "cold", "spam"]).toContain(r.quality);
    }
  });

  it("등급 경계: 점수 높을수록 등급이 나빠지지 않는다(단조)", () => {
    const order = { spam: 0, cold: 1, warm: 2, hot: 3 } as const;
    const lo = evaluateLeadQuality({ messageLength: 5, missingFieldsCount: 9, emailDomain: "tempmail.com" });
    const hi = evaluateLeadQuality({ country: "KZ", missingFieldsCount: 0, messageLength: 300, intakeCompleteness: 0.9 });
    expect(order[hi.quality]).toBeGreaterThanOrEqual(order[lo.quality]);
  });
});
