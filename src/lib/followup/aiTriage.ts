/**
 * healwith: 증상 위험도 «AI 2차 판정» — 규칙 판정이 못 보는 표현을 제미나이가 한 번 더 본다.
 *
 * 왜 (2026-09-06 PO «사후관리 3대 보완» C): symptomAnalyzer 는 응급 키워드 + 점수식(규칙)이다.
 *   파일 머리말의 「2차: AI 분석」은 넉 달간 미구현이었다. 러시아어 구어·카자흐어 완곡 표현·
 *   «약 먹어도 안 듣는다» 같은 문맥은 키워드로는 못 잡는다.
 *
 * 안전 원칙(환각 가드)
 *   · AI 는 위험도를 **올릴 수만** 있다. 내릴 수 없다 — 규칙이 응급이라 했으면 응급이다.
 *   · JSON 이 아니거나 시간 초과·오류면 **규칙 결과 그대로**(fail-safe). 환자 화면이 AI 때문에 멈추지 않는다.
 *   · 근거(reason)는 «환자가 쓴 말»을 인용해야 한다고 지시하고, 확신도가 낮으면(<0.5) 올리지 않는다.
 *   · 진단하지 않는다 — 「연락이 필요한가」만 묻는다.
 *   · 비용은 surface="triage" 로 계측(ai_usage_events). 끄려면 env SYMPTOM_AI_TRIAGE=0.
 */

import "server-only";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { callGeminiWithCompat, DEFAULT_THINKING_LEVEL } from "@/lib/ai/geminiThinkingCompat";
import { logAiUsage } from "@/lib/ai/usageLog";
import {
  analyzeSymptoms,
  type SymptomAnalysis,
  type SymptomReport,
  type UrgencyLevel,
  type RecommendedAction,
} from "./symptomAnalyzer";

export interface AiTriage {
  urgency: UrgencyLevel;
  escalate: boolean;
  confidence: number; // 0~1
  reason: string;
  model: string;
}

const URGENCY_RANK: Record<UrgencyLevel, number> = { low: 0, medium: 1, high: 2, emergency: 3 };
const ACTION_FOR_URGENCY: Record<UrgencyLevel, RecommendedAction> = {
  low: "auto_response",
  medium: "schedule_followup",
  high: "escalate_agent",
  emergency: "emergency_refer",
};
const RISK_FLOOR: Record<UrgencyLevel, number> = { low: 0, medium: 0.4, high: 0.7, emergency: 0.9 };
const MIN_CONFIDENCE = 0.5;
const TIMEOUT_MS = 8000;
const MODEL = "gemini-flash-latest";

/**
 * 순수 병합 — 단위 시험으로 잠근다. AI 는 올리기만 한다.
 */
export function mergeTriage(rule: SymptomAnalysis, ai: AiTriage | null): SymptomAnalysis {
  if (!ai) return rule;
  const note = `\n[AI 2차 판정] ${ai.urgency} · 확신 ${(ai.confidence * 100).toFixed(0)}% · ${ai.reason}`;
  const raise = ai.escalate && ai.confidence >= MIN_CONFIDENCE && URGENCY_RANK[ai.urgency] > URGENCY_RANK[rule.urgencyLevel];
  if (!raise) {
    return { ...rule, assessment: rule.assessment + note };
  }
  return {
    ...rule,
    urgencyLevel: ai.urgency,
    riskScore: Math.max(rule.riskScore, RISK_FLOOR[ai.urgency]),
    recommendedAction: ACTION_FOR_URGENCY[ai.urgency],
    requiresHumanReview: true,
    assessment: rule.assessment + note + " → 담당자 확인 필요로 상향",
  };
}

function buildPrompt(report: SymptomReport, rule: SymptomAnalysis): string {
  const lines = report.symptoms
    .map((s) => `- ${s.symptom} (severity ${s.severity}/10, duration: ${s.duration || "?"}, lang: ${s.language || "?"})`)
    .join("\n");
  return `You are a triage assistant for a Korean cancer-care coordination service. Patients are usually abroad (Kazakhstan/Russia) and write in their own language.
Do NOT diagnose. Decide only whether a human coordinator or doctor should contact the patient sooner than the rule-based result suggests.

Rule-based result: urgency=${rule.urgencyLevel}, riskScore=${rule.riskScore}.

Patient report:
${lines}
Notes: ${report.additionalNotes || "(none)"}

Return ONLY JSON:
{"urgency":"low|medium|high|emergency","escalate":true|false,"confidence":0.0-1.0,"reason":"one short sentence in Korean that quotes the patient's own words that drove the decision"}
Rules: escalate=true only if the patient's words indicate worsening, uncontrolled pain, bleeding, breathing trouble, fever, confusion, inability to eat/drink, or the patient explicitly asks for help. If unsure, escalate=false with low confidence.`;
}

function parse(raw: string): AiTriage | null {
  let json = raw.trim();
  const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) json = fence[1].trim();
  try {
    const o = JSON.parse(json);
    const urgency = ["low", "medium", "high", "emergency"].includes(o.urgency) ? (o.urgency as UrgencyLevel) : null;
    if (!urgency) return null;
    const confidence = Math.min(1, Math.max(0, Number(o.confidence) || 0));
    return {
      urgency,
      escalate: o.escalate === true,
      confidence,
      reason: String(o.reason || "").slice(0, 300),
      model: MODEL,
    };
  } catch {
    return null;
  }
}

/** 제미나이 2차 판정. 실패·시간 초과·꺼짐이면 null. */
export async function aiSymptomTriage(report: SymptomReport, rule: SymptomAnalysis): Promise<AiTriage | null> {
  if (process.env.SYMPTOM_AI_TRIAGE === "0") return null;
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  try {
    const call = callGeminiWithCompat((p) => generateText(p as any), {
      model: google(MODEL) as any,
      prompt: buildPrompt(report, rule),
      maxOutputTokens: 300,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: DEFAULT_THINKING_LEVEL } } },
    });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
    const result: any = await Promise.race([call, timeout]);
    if (!result) return null;
    void logAiUsage({ surface: "triage", model: MODEL, usage: result?.usage, response: result?.response });
    return parse(result.text ?? "");
  } catch (err: any) {
    console.warn("[aiTriage] 실패(규칙 결과 유지):", err?.message);
    return null;
  }
}

/** 규칙 1차 + AI 2차를 한 번에. 저장 경로 셋(환자 포털·진행상황 링크·API)이 같이 쓴다. */
export async function analyzeSymptomsWithAi(report: SymptomReport): Promise<SymptomAnalysis> {
  const rule = analyzeSymptoms(report);
  const ai = await aiSymptomTriage(report, rule);
  return mergeTriage(rule, ai);
}
