/**
 * Batch classification: one LLM call with JSON input/output.
 * Input: array of candidate strings (max 50; caller should limit to 20).
 * Output: { labels: [{ name, is_procedure, reason }] } or null on timeout/error/429.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const MODEL = "gemini-3-flash";
const TIMEOUT_MS = 8_000;
const TEMPERATURE = 0;

const SYSTEM_PROMPT = `You are a medical content classifier.
You will receive a JSON array of Korean text strings.
For each string, determine if it is the name of a medical treatment, procedure, test, surgery, or program offered by a hospital.

Return ONLY valid JSON in this exact format (no markdown, no other text):
{"labels":[{"name":"<exact input string>","is_procedure":true|false,"reason":"<short reason in Korean>"},...]}

- is_procedure true = actual procedure/treatment/test/surgery/program name (검사명, 수술명, 치료 프로그램명).
- is_procedure false = marketing sentence, pain description, blog title, consultation prompt, time-based slogan, or general disease explanation.
- reason = one short phrase explaining why (for debug only).
- Preserve the exact "name" from input for each label. Output array length must equal input array length.`;

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(MODEL) as ReturnType<typeof google>;
  }
  return null;
}

export interface LabelResult {
  name: string;
  is_procedure: boolean;
  reason: string;
}

/**
 * Classify all candidates in one call. Returns labels (same order as input) or null on timeout/error/parse failure.
 * 8s timeout via AbortController.
 */
export async function classifyMedicalProcedures(
  candidates: string[]
): Promise<Array<LabelResult> | null> {
  const n = candidates.length;
  if (n === 0) return [];

  const model = getModel();
  if (!model) return null;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  const inputJson = JSON.stringify(candidates);
  const userPrompt = `Input array (JSON):\n${inputJson}\n\nOutput: single JSON object with "labels" array of ${n} items only.`;

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: TEMPERATURE,
      maxOutputTokens: Math.max(512, n * 30 + 64),
      abortSignal: abortController.signal,
    });
    clearTimeout(timeoutId);

    const raw = (text || "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { labels?: Array<{ name?: string; is_procedure?: boolean; reason?: string }> };
    const labels = parsed?.labels;
    if (!Array.isArray(labels) || labels.length !== n) return null;

    return labels.map((item, i) => ({
      name: typeof item?.name === "string" ? item.name : candidates[i] ?? "",
      is_procedure: item?.is_procedure === true,
      reason: typeof item?.reason === "string" ? item.reason : "",
    }));
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export function isClassifyMedicalProceduresAvailable(): boolean {
  return getModel() !== null;
}
