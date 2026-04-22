/**
 * HOSPITAL_OFFER_IMPORT_V1: 수집 텍스트에서 대표 시술 3개 LLM 추출
 * - 출처 없는 값 null. 효과/확정가/verified 금지.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { OfferItem, TreatmentOffer, OfferEvidence } from "./types";

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-3-flash") as any;
  }
  return null;
}

const SYSTEM_PROMPT = `You extract "representative treatments/programs" (up to 3) from hospital website text for HEALO.

Selection criteria (for consistency across runs):
- Prefer treatments listed in main navigation, hero section, or treatment menu.
- Prefer those with more visible content (price, description).
- If multiple candidates, list in alphabetical order by treatment name for reproducibility.
- Same website content should yield the same 3 treatments every time.

Rules (strict):
- Only include fields where you find explicit evidence in the text. Leave any field without evidence as null or [].
- Do NOT invent prices, recovery time, or effects. No "verified" wording. Use captured_at/source_url only.
- Do NOT make medical claims (e.g. "treats X", "guaranteed results"). If the hospital states something, summarize as "병원은 ...라고 설명합니다" only.
- Price: if only a range or "from X" appears, use that; if unclear, leave null. Do not fix or confirm prices.
- Output ONLY valid JSON, no markdown fences.

Output schema (exactly):
{
  "offers": [
    {
      "treatment": {
        "name": "required",
        "slug": null or "url-safe-slug",
        "description": null or string,
        "full_description": null or string,
        "duration": null or number (minutes),
        "anesthesia_type": null or string,
        "recovery_time_min": null or number,
        "recovery_time_max": null or number,
        "side_effects": [],
        "precautions": [],
        "price_min": null or number,
        "price_max": null or number,
        "currency": null or "KRW" etc,
        "price_includes": [],
        "tags": [],
        "images": []
      },
      "evidence": {
        "name": { "source_url": "page url", "snippet_or_ocr_text": "exact quote" },
        ... one entry per field that has evidence (at least "name")
      },
      "confidence": 0.0 to 1.0
    }
  ]
}
Max 3 items in offers. If nothing relevant, return { "offers": [] }.
List offers in order: (1) by prominence in page, (2) alphabetically by name for tie-breaking.`;

/** evidence.name에 snippet_or_ocr_text가 있어야 채택 */
function hasEvidence(o: OfferItem): boolean {
  const ev = o.evidence?.name;
  if (!ev || typeof ev !== "object") return false;
  const snip = (ev as { snippet_or_ocr_text?: string })?.snippet_or_ocr_text;
  return Boolean(snip && String(snip).trim().length > 0);
}

function tryParseOffers(raw: string): { candidates: OfferItem[]; selected: OfferItem[] } {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const jsonStart = cleaned.indexOf("{");
  if (jsonStart >= 0) {
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonEnd > jsonStart) cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed?.offers) ? parsed.offers : [];
    const candidates: OfferItem[] = [];
    for (const o of arr) {
      if (!o?.treatment?.name) continue;
      const treatment: TreatmentOffer = {
        name: String(o.treatment.name),
        slug: o.treatment.slug ?? null,
        description: o.treatment.description ?? null,
        full_description: o.treatment.full_description ?? null,
        duration: o.treatment.duration ?? null,
        anesthesia_type: o.treatment.anesthesia_type ?? null,
        recovery_time_min: o.treatment.recovery_time_min ?? null,
        recovery_time_max: o.treatment.recovery_time_max ?? null,
        side_effects: Array.isArray(o.treatment.side_effects) ? o.treatment.side_effects : [],
        precautions: Array.isArray(o.treatment.precautions) ? o.treatment.precautions : [],
        price_min: o.treatment.price_min ?? null,
        price_max: o.treatment.price_max ?? null,
        currency: o.treatment.currency ?? null,
        price_includes: Array.isArray(o.treatment.price_includes) ? o.treatment.price_includes : [],
        tags: Array.isArray(o.treatment.tags) ? o.treatment.tags : [],
        images: Array.isArray(o.treatment.images) ? o.treatment.images : [],
      };
      const evidence: OfferEvidence = typeof o.evidence === "object" && o.evidence !== null ? o.evidence : {};
      const confidence = typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5;
      candidates.push({ treatment, evidence, confidence });
    }
    candidates.sort((a, b) => {
      const conf = (b.confidence ?? 0) - (a.confidence ?? 0);
      if (conf !== 0) return conf;
      return (a.treatment.name || "").localeCompare(b.treatment.name || "");
    });
    const selected = candidates.filter(hasEvidence).slice(0, 3);
    return { candidates, selected };
  } catch {
    return { candidates: [], selected: [] };
  }
}

export function isExtractOffersAvailable(): boolean {
  return getModel() !== null;
}

export interface ExtractionAttempt {
  mode: "llm" | "regex";
  candidates_count: number;
  selected_count: number;
  fail_reason?: string;
}

export async function extractOffersFromText(
  combinedText: string,
  sourceUrls: string[]
): Promise<OfferItem[]> {
  const out = await extractOffersFromTextWithAttempt(combinedText, sourceUrls);
  return out.offers;
}

/** evidence 포함된 항목만 반환 + extraction_attempt */
export async function extractOffersFromTextWithAttempt(
  combinedText: string,
  sourceUrls: string[]
): Promise<{ offers: OfferItem[]; extraction_attempt: ExtractionAttempt }> {
  const attempt: ExtractionAttempt = { mode: "llm", candidates_count: 0, selected_count: 0 };
  const model = getModel();
  if (!model) {
    attempt.fail_reason = "llm_unavailable";
    return { offers: [], extraction_attempt: attempt };
  }
  if (!combinedText || combinedText.length < 30) {
    attempt.fail_reason = "insufficient_text";
    return { offers: [], extraction_attempt: attempt };
  }

  const sourceList = sourceUrls.length ? sourceUrls.join(", ") : "unknown";
  const prompt = `Source URLs: ${sourceList}\n\nExtract up to 3 representative treatments/programs from the following text. Only include fields with evidence. Each offer MUST have evidence.name with snippet_or_ocr_text.\n\nText:\n${combinedText.slice(0, 120000)}`;

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0,
      maxOutputTokens: 4096,
    });
    const { candidates, selected } = tryParseOffers(text);
    attempt.candidates_count = candidates.length;
    attempt.selected_count = selected.length;
    if (candidates.length > 0 && selected.length === 0) {
      attempt.fail_reason = "no_evidence_for_candidates";
    } else if (candidates.length === 0) {
      attempt.fail_reason = "site_has_no_treatments";
    }
    return { offers: selected, extraction_attempt: attempt };
  } catch (e) {
    console.error("[extractOffersLLM]", e);
    attempt.fail_reason = "llm_error";
    return { offers: [], extraction_attempt: attempt };
  }
}
