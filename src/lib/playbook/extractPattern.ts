/**
 * HEALO: 대화 transcript에서 응대 논리 구조(패턴) 추출
 *
 * 1차: rule-based 최소 생성 (항상 유효 JSON)
 * 2차: LLM 키 있으면 JSON 고도화 (실패 시 fallback)
 * PII 제거: sanitizeResponse 재사용
 */

import "server-only";

import { sanitizeResponse, computeQualityScore as computeSanitizeScore } from "./sanitize";

export interface PatternMessage {
  actor_type: string;
  message_text: string;
  created_at: string;
  id?: string;
}

export interface PatternContext {
  language?: string;
  country?: string;
  treatment_slug?: string;
}

export interface ResponseStructure {
  opening: string;
  disclaimers: string[];
  steps: string[];
  options: Array<{ name: string; when: string; notes: string }>;
  handoff_rule: { when: string; what_to_collect: string[] };
  closing: string;
}

export interface ExtractedPattern {
  scope: "treatment" | "country" | "general";
  treatment_slug: string | null;
  country: string | null;
  trigger: Record<string, any>;
  user_intent: string;
  key_questions: string[];
  response_structure: ResponseStructure;
  response_template: string;
  safety_notes: string[];
  quality_score: number;
  source_message_ids: string[];
}

function ruleBasedExtract(
  messages: PatternMessage[],
  ctx: PatternContext
): ExtractedPattern {
  const patientMsgs = messages.filter((m) => m.actor_type === "patient");
  const adminMsgs = messages.filter((m) => m.actor_type === "admin" || m.actor_type === "system");

  const allPatientText = patientMsgs.map((m) => m.message_text).join(" ");
  const allAdminText = adminMsgs.map((m) => m.message_text).join(" ");

  const scope: "treatment" | "country" | "general" = ctx.treatment_slug
    ? "treatment"
    : ctx.country
      ? "country"
      : "general";

  const triggers: Record<string, boolean> = {};
  const lower = allPatientText.toLowerCase();
  if (/budget|cost|price|비용|가격/.test(lower)) triggers.budget = true;
  if (/stay|days|nights|기간|숙박/.test(lower)) triggers.stay_days = true;
  if (/interpret|translat|통역/.test(lower)) triggers.interpreter = true;
  if (/concern|worry|risk|부작용|걱정/.test(lower)) triggers.concerns = true;
  if (/recovery|healing|회복/.test(lower)) triggers.recovery = true;

  const userIntent = patientMsgs.length > 0
    ? patientMsgs[0].message_text.slice(0, 200)
    : "General inquiry";

  const keyQuestions: string[] = [];
  if (!triggers.budget) keyQuestions.push("What is your approximate budget?");
  if (!triggers.stay_days) keyQuestions.push("How many days can you stay in Korea?");
  keyQuestions.push("Do you have any medical records or test results to share?");
  keyQuestions.push("Do you have any allergies or current medications?");

  const adminSteps = adminMsgs
    .slice(0, 5)
    .map((m) => m.message_text.slice(0, 300));

  const { sanitized: templateRaw } = sanitizeResponse(allAdminText);
  const template = templateRaw.slice(0, 2000);

  const structure: ResponseStructure = {
    opening: "Thank you for reaching out to HEALO.",
    disclaimers: [
      "This is general guidance, not medical advice.",
      "Final pricing depends on individual consultation.",
    ],
    steps: adminSteps.length > 0 ? adminSteps : ["Gather patient concerns", "Provide general information", "Offer to connect with coordinator"],
    options: [],
    handoff_rule: {
      when: "Patient requests human agent, complex case, or high urgency",
      what_to_collect: ["name", "contact", "main concern", "preferred date"],
    },
    closing: "Would you like me to connect you with a coordinator for more details?",
  };

  const safetyNotes = [
    "Do not confirm specific pricing",
    "Do not rank hospitals or doctors",
    "Do not guarantee treatment outcomes",
  ];

  const messageIds = messages
    .filter((m) => m.id)
    .map((m) => m.id!);

  const filledFields = [
    scope !== "general",
    Object.keys(triggers).length > 0,
    keyQuestions.length > 2,
    adminSteps.length > 0,
    safetyNotes.length >= 3,
  ].filter(Boolean).length;

  const { flags } = sanitizeResponse(allAdminText);
  const piiPenalty = flags.filter((f) => !f.startsWith("policy:")).length * 5;
  const qualityScore = Math.max(0, Math.min(100, 40 + filledFields * 10 - piiPenalty));

  return {
    scope,
    treatment_slug: ctx.treatment_slug || null,
    country: ctx.country || null,
    trigger: triggers,
    user_intent: userIntent,
    key_questions: keyQuestions,
    response_structure: structure,
    response_template: template,
    safety_notes: safetyNotes,
    quality_score: qualityScore,
    source_message_ids: messageIds,
  };
}

async function llmEnhance(
  base: ExtractedPattern,
  messages: PatternMessage[],
  ctx: PatternContext
): Promise<ExtractedPattern> {
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!googleKey) return base;

  const transcript = messages
    .filter((m) => !m.message_text.includes("[INTERNAL]"))
    .slice(-15)
    .map((m) => {
      const role = m.actor_type === "patient" ? "Patient" : m.actor_type === "admin" ? "Coordinator" : "System";
      return `${role}: ${m.message_text}`;
    })
    .join("\n");

  const prompt = `Analyze this medical tourism conversation and extract a reusable response pattern as JSON.

Conversation:
${transcript}

Context: language=${ctx.language || "en"}, country=${ctx.country || "unknown"}, treatment=${ctx.treatment_slug || "general"}

Return ONLY valid JSON with these fields:
{
  "user_intent": "one sentence summarizing what the patient wants",
  "key_questions": ["list of follow-up questions the coordinator should ask"],
  "response_structure": {
    "opening": "greeting template",
    "disclaimers": ["list of required disclaimers"],
    "steps": ["step-by-step response guidance"],
    "options": [{"name":"option name","when":"condition","notes":"details"}],
    "handoff_rule": {"when":"condition for human handoff","what_to_collect":["fields"]},
    "closing": "closing template"
  },
  "safety_notes": ["things to avoid saying"]
}

Rules:
- No PII (emails, phones, names)
- No definitive pricing or rankings
- Focus on reusable logic, not specific case details`;

  try {
    let text: string | null = null;

    if (googleKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    }

    if (!text) return base;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return base;

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.user_intent) base.user_intent = String(parsed.user_intent).slice(0, 300);
    if (Array.isArray(parsed.key_questions)) base.key_questions = parsed.key_questions.map(String).slice(0, 10);
    if (parsed.response_structure?.opening) base.response_structure.opening = String(parsed.response_structure.opening);
    if (Array.isArray(parsed.response_structure?.disclaimers)) base.response_structure.disclaimers = parsed.response_structure.disclaimers.map(String);
    if (Array.isArray(parsed.response_structure?.steps)) base.response_structure.steps = parsed.response_structure.steps.map(String);
    if (Array.isArray(parsed.response_structure?.options)) base.response_structure.options = parsed.response_structure.options;
    if (parsed.response_structure?.handoff_rule) base.response_structure.handoff_rule = parsed.response_structure.handoff_rule;
    if (parsed.response_structure?.closing) base.response_structure.closing = String(parsed.response_structure.closing);
    if (Array.isArray(parsed.safety_notes)) base.safety_notes = parsed.safety_notes.map(String);

    const { sanitized } = sanitizeResponse(base.response_structure.steps.join(" ") + " " + (base.response_structure.opening || ""));
    if (sanitized !== base.response_template) {
      base.response_template = sanitizeResponse(
        base.response_structure.opening + "\n\n" +
        base.response_structure.steps.join("\n") + "\n\n" +
        base.response_structure.closing
      ).sanitized;
    }

    base.quality_score = Math.min(100, base.quality_score + 20);

    return base;
  } catch (err) {
    console.error("[extractPattern] LLM enhance failed:", err);
    return base;
  }
}

export async function extractPattern(
  messages: PatternMessage[],
  context: PatternContext
): Promise<ExtractedPattern> {
  const base = ruleBasedExtract(messages, context);
  return llmEnhance(base, messages, context);
}
