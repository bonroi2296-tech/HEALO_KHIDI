/**
 * LLM 1회 배치 요약: chunks + priceHints → 3~5개 시술 (name_ko, short_desc_ko, related_info_ko, 가격, evidence).
 * quote_ko는 반드시 chunks에서 부분 문자열로 검사. 8초 타임아웃. 실패 시 degrade로 job done 유지.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { OfferItem, TreatmentOffer, OfferEvidence } from "./types";
import type { PriceHint } from "./priceHints";

const MODEL = (process.env.OFFERS_SUMMARY_MODEL || "gemini-3-flash").trim();
const TIMEOUT_MS = 8_000;
const TEMPERATURE = 0;
const MAX_OFFERS = 5;
const MIN_OFFERS = 3;

const SYSTEM_PROMPT = `You are a medical content summarizer for a hospital website. Language: Korean only.
Input: hospital name + one combined text of evidence chunks (with [URL: ...] tags) + optional price hints (시술명: 가격).
Output ONLY valid JSON (no markdown, no other text). Rules:
- Write ONLY what is supported by the evidence. No invention.
- name_ko: noun phrase 6~40 chars (시술/검사/치료명). No sentence, no slogan.
- short_desc_ko: 1~2 sentences, max 160 chars.
- related_info_ko: array of 3~5 bullets, each max 40 chars (대상/구성/기간/주의/특징 only if evidence supports).
- price_min, price_max, currency: from price hints if matched; else null.
- price_note: "문의" if no price.
- evidence.quote_ko: MUST be a direct 30~90 char excerpt from the chunks (exact substring). evidence.source_url: from chunk URL.
- confidence: 0~1.
Output 3~5 offers. If evidence is insufficient, output fewer.`;

export interface SummarizeInput {
  hospitalName: string;
  chunksText: string;
  priceHints: Record<string, PriceHint>;
}

export interface SummarizeResult {
  offers: OfferItem[];
  llm_timeout: boolean;
  llm_ms?: number;
  llm_model?: string;
}

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(MODEL) as ReturnType<typeof google>;
  }
  return null;
}

/** quote_ko가 chunksText의 부분 문자열인지 검사 (공백 정규화 후) */
function isQuoteFromChunks(quote: string, chunksText: string): boolean {
  const q = (quote || "").trim().replace(/\s+/g, " ");
  const c = chunksText.replace(/\s+/g, " ");
  return c.includes(q) || q.length < 20;
}

export async function summarizeOffersBatch(input: SummarizeInput): Promise<SummarizeResult> {
  const start = Date.now();
  const model = getModel();
  if (!model || !input.chunksText.trim()) {
    return { offers: [], llm_timeout: false };
  }

  const hintsStr =
    Object.entries(input.priceHints).length > 0
      ? "가격 힌트 (시술명: 가격):\n" +
        Object.entries(input.priceHints)
          .slice(0, 30)
          .map(([name, h]) => `${name}: ${h.price_min ?? h.price_note ?? "문의"}`)
          .join("\n")
      : "(가격 힌트 없음)";

  const userPrompt = `병원명: ${input.hospitalName}\n\n${hintsStr}\n\n---\n\n근거 텍스트:\n${input.chunksText.slice(0, 6000)}\n\n위 근거만 사용해 JSON 배열로 요약하세요. offers 배열 길이는 3~5개. related_info_ko는 문자열 배열.`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: TEMPERATURE,
      maxOutputTokens: 1024,
      abortSignal: abortController.signal,
    });
    clearTimeout(timeoutId);
    const llm_ms = Date.now() - start;

    const raw = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { offers: [], llm_timeout: false, llm_ms, llm_model: MODEL };
    }
    const arr = Array.isArray((parsed as { offers?: unknown }).offers)
      ? (parsed as { offers: unknown[] }).offers
      : Array.isArray(parsed)
        ? parsed
        : [];
    const offers: OfferItem[] = [];
    for (const item of arr.slice(0, MAX_OFFERS)) {
      const o = item as Record<string, unknown>;
      const name = typeof o.name_ko === "string" ? o.name_ko.trim() : "";
      if (!name || name.length < 2) continue;
      const shortDesc = typeof o.short_desc_ko === "string" ? o.short_desc_ko.trim().slice(0, 160) : "";
      let relatedArr: string[] = [];
      if (Array.isArray(o.related_info_ko)) {
        relatedArr = o.related_info_ko.map((s) => String(s).slice(0, 40)).filter(Boolean);
      } else if (typeof o.related_info_ko === "string") {
        relatedArr = (o.related_info_ko as string)
          .split(/\n+/)
          .map((s) => s.trim().slice(0, 40))
          .filter(Boolean);
      }
      const relatedInfo = relatedArr;
      const fullDesc = relatedInfo.length > 0 ? `${shortDesc}\n\n${relatedInfo.join("\n")}`.trim() : shortDesc;
      const priceMin = typeof o.price_min === "number" ? o.price_min : null;
      const priceMax = typeof o.price_max === "number" ? o.price_max : null;
      const currency = o.currency === "USD" ? "USD" : null;
      const priceNote = priceMin == null && priceMax == null ? "문의" : null;
      const ev = o.evidence as { source_url?: string; quote_ko?: string } | undefined;
      let quoteKo = typeof ev?.quote_ko === "string" ? ev.quote_ko.trim().slice(0, 90) : shortDesc.slice(0, 90);
      if (!isQuoteFromChunks(quoteKo, input.chunksText)) quoteKo = shortDesc.slice(0, 90) || name;
      const sourceUrl = typeof ev?.source_url === "string" ? ev.source_url : "";
      const confidence = typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.85;

      const treatment: TreatmentOffer = {
        name,
        description: shortDesc || undefined,
        full_description: fullDesc || undefined,
        price_min: priceMin ?? undefined,
        price_max: priceMax ?? undefined,
        currency: priceNote ? null : (currency ?? "KRW"),
        price_note: priceNote ?? undefined,
      };
      const evidence: OfferEvidence = {
        name: { source_url: sourceUrl, snippet_or_ocr_text: quoteKo },
      };
      offers.push({ treatment, evidence, confidence });
    }

    return {
      offers,
      llm_timeout: false,
      llm_ms,
      llm_model: MODEL,
    };
  } catch {
    clearTimeout(timeoutId);
    const llm_ms = Date.now() - start;
    return {
      offers: [],
      llm_timeout: true,
      llm_ms,
      llm_model: MODEL,
    };
  }
}
