import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateText: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ google: () => ({}) }));
vi.mock("@/lib/ai/geminiThinkingCompat", () => ({ callGeminiWithCompat: vi.fn(), DEFAULT_THINKING_LEVEL: "low" }));
vi.mock("@/lib/ai/usageLog", () => ({ logAiUsage: vi.fn() }));

import { mergeTriage } from "./aiTriage";
import type { SymptomAnalysis } from "./symptomAnalyzer";

const rule: SymptomAnalysis = {
  riskScore: 0.2,
  urgencyLevel: "low",
  assessment: "낮은 위험도",
  recommendedAction: "auto_response",
  flaggedSymptoms: [],
  requiresHumanReview: false,
};

describe("mergeTriage — AI 는 위험도를 올릴 수만 있다", () => {
  it("AI 결과가 없으면 규칙 결과 그대로", () => {
    expect(mergeTriage(rule, null)).toEqual(rule);
  });

  it("확신 있는 상향은 단계·조치·검토 필요를 올리고 근거를 남긴다", () => {
    const r = mergeTriage(rule, { urgency: "high", escalate: true, confidence: 0.8, reason: "«약을 먹어도 통증이 안 가라앉는다»", model: "m" });
    expect(r.urgencyLevel).toBe("high");
    expect(r.recommendedAction).toBe("escalate_agent");
    expect(r.requiresHumanReview).toBe(true);
    expect(r.riskScore).toBeGreaterThanOrEqual(0.7);
    expect(r.assessment).toContain("AI 2차 판정");
    expect(r.assessment).toContain("상향");
  });

  it("확신이 낮으면(<0.5) 올리지 않고 메모만 남긴다", () => {
    const r = mergeTriage(rule, { urgency: "high", escalate: true, confidence: 0.3, reason: "불확실", model: "m" });
    expect(r.urgencyLevel).toBe("low");
    expect(r.recommendedAction).toBe("auto_response");
    expect(r.assessment).toContain("AI 2차 판정");
  });

  it("규칙이 응급이면 AI 가 낮게 봐도 내려가지 않는다", () => {
    const emergency: SymptomAnalysis = { ...rule, urgencyLevel: "emergency", riskScore: 0.95, recommendedAction: "emergency_refer", requiresHumanReview: true };
    const r = mergeTriage(emergency, { urgency: "low", escalate: false, confidence: 0.9, reason: "괜찮아 보임", model: "m" });
    expect(r.urgencyLevel).toBe("emergency");
    expect(r.riskScore).toBe(0.95);
    expect(r.recommendedAction).toBe("emergency_refer");
  });

  it("escalate=false 면 단계가 높아도 올리지 않는다", () => {
    const r = mergeTriage(rule, { urgency: "high", escalate: false, confidence: 0.9, reason: "x", model: "m" });
    expect(r.urgencyLevel).toBe("low");
  });
});
