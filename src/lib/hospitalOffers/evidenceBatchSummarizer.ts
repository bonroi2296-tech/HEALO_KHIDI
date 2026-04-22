/**
 * LLM Structured Summarizer: evidence chunks + 가격 정보 → 시술명/설명/관련정보/가격 JSON (batch 1회).
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { OfferItem, TreatmentOffer, OfferEvidence } from "./types";
import type { EvidenceChunk } from "./evidenceCollector";

const MODEL = (process.env.OFFERS_SUMMARY_MODEL || "gemini-3-flash").trim();
const TIMEOUT_MS = 10_000;
const TEMPERATURE = 0;

const SYSTEM_PROMPT = `You are a medical content summarizer for a hospital website.
Given hospital name and for each treatment candidate: evidence chunk(s) and optional price row.
Output ONLY valid JSON array (no markdown, no other text). Rules:
- Write ONLY what is supported by the evidence. No invention.
- name_ko: noun phrase only (시술/검사/치료명). Reject or fix sentence-like/blog titles.
- short_desc_ko: 1~2 sentences, no exaggeration.
- related_info_ko: 3~5 bullet points (대상/구성/기간/주의/특징) only if evidence supports.
- price_min, price_max, currency: from price row if given; else null.
- price_note: "문의" if no price.
- evidence.quote_ko: 30~80 chars from chunk.
- confidence: 0~1.

Output format (array):
[
  {
    "name_ko": "string",
    "short_desc_ko": "string",
    "related_info_ko": "string (bullets, newline-separated)",
    "price_min": number|null,
    "price_max": number|null,
    "currency": "KRW"|null,
    "price_note": "문의"|null,
    "evidence": { "source_url": "string", "quote_ko": "string" },
    "confidence": number
  }
]`;

export interface CandidateWithEvidence {
  name: string;
  chunks: EvidenceChunk[];
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  price_note?: string | null;
}

export interface BatchSummarizerResult {
  offers: OfferItem[];
  timeout: boolean;
  rejected_samples?: Array<{ name: string; reason: string }>;
}

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(MODEL) as ReturnType<typeof google>;
  }
  return null;
}

export async function buildOffersFromEvidenceBatch(
  hospitalName: string,
  candidates: CandidateWithEvidence[]
): Promise<BatchSummarizerResult> {
  if (candidates.length === 0) {
    return { offers: [], timeout: false };
  }

  const model = getModel();
  if (!model) {
    return { offers: [], timeout: false };
  }

  const parts = candidates.map((c, i) => {
    const chunkTexts = c.chunks.map((ch) => `[URL: ${ch.url}]\n${ch.chunk_text}`).join("\n\n");
    const priceRow =
      c.price_min != null
        ? `가격: ${c.price_min}${c.price_max != null ? `~${c.price_max}` : ""} ${c.currency ?? "KRW"}`
        : "가격: 문의";
    return `[후보 ${i + 1}]\n시술명 후보: ${c.name}\n${priceRow}\n\n근거 문단:\n${chunkTexts || "(없음)"}`;
  });

  const userPrompt = `병원명: ${hospitalName}\n\n${parts.join("\n\n---\n\n")}\n\n위 근거만 사용해 JSON 배열로 요약하세요. 배열 길이는 ${candidates.length}입니다.`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: TEMPERATURE,
      maxOutputTokens: Math.max(1024, candidates.length * 280),
      abortSignal: abortController.signal,
    });
    clearTimeout(timeoutId);

    const raw = (text || "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return { offers: [], timeout: false };

    const offers: OfferItem[] = [];
    const rejected: Array<{ name: string; reason: string }> = [];

    for (let i = 0; i < parsed.length && i < candidates.length; i++) {
      const item = parsed[i] as Record<string, unknown>;
      const name = typeof item?.name_ko === "string" ? item.name_ko.trim() : candidates[i].name;
      if (!name || name.length < 2) {
        rejected.push({ name: candidates[i].name, reason: "empty_name" });
        continue;
      }

      const shortDesc = typeof item?.short_desc_ko === "string" ? item.short_desc_ko.trim() : "";
      const relatedInfo = typeof item?.related_info_ko === "string" ? item.related_info_ko.trim() : "";
      const fullDesc = relatedInfo ? `${shortDesc}\n\n${relatedInfo}`.trim() : shortDesc;

      const priceMin = typeof item?.price_min === "number" ? item.price_min : candidates[i].price_min ?? null;
      const priceMax = typeof item?.price_max === "number" ? item.price_max : candidates[i].price_max ?? null;
      const currency = typeof item?.currency === "string" ? item.currency : candidates[i].currency ?? null;
      const priceNote =
        priceMin == null && priceMax == null
          ? (typeof item?.price_note === "string" ? item.price_note : "문의")
          : null;

      const ev = item?.evidence as { source_url?: string; quote_ko?: string } | undefined;
      const sourceUrl = typeof ev?.source_url === "string" ? ev.source_url : candidates[i].chunks[0]?.url ?? "";
      const quoteKo = typeof ev?.quote_ko === "string" ? ev.quote_ko.slice(0, 200) : shortDesc.slice(0, 200);

      const confidence = typeof item?.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.85;

      const treatment: TreatmentOffer = {
        name,
        description: shortDesc || undefined,
        full_description: fullDesc || undefined,
        price_min: priceMin ?? undefined,
        price_max: priceMax ?? undefined,
        currency: priceNote ? null : (currency ?? undefined),
        price_note: priceNote ?? undefined,
      };
      const evidence: OfferEvidence = {
        name: { source_url: sourceUrl, snippet_or_ocr_text: quoteKo },
      };
      offers.push({ treatment, evidence, confidence });
    }

    return {
      offers,
      timeout: false,
      rejected_samples: rejected.slice(0, 5),
    };
  } catch {
    clearTimeout(timeoutId);
    return { offers: [], timeout: true };
  }
}

export function isEvidenceBatchSummarizerAvailable(): boolean {
  return getModel() !== null;
}
