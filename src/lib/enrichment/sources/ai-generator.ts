import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { EnrichmentSource, EnrichmentResult, HospitalRow } from "../types";

function tryRepairJson(raw: string): any | null {
  let s = raw.replace(/,?\s*$/, "");
  const opens = { "{": 0, "[": 0 };
  let inStr = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") opens["{"]++;
    if (ch === "}") opens["{"]--;
    if (ch === "[") opens["["]++;
    if (ch === "]") opens["["]--;
  }
  if (inStr) s += '"';
  while (opens["["] > 0) { s += "]"; opens["["]--; }
  while (opens["{"] > 0) { s += "}"; opens["{"]--; }
  try { return JSON.parse(s); } catch { return null; }
}

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google("gemini-3-flash") as any;
  }
  return null;
}

function buildHospitalContext(h: HospitalRow): string {
  const parts: string[] = [];
  parts.push(`Hospital Name: ${h.name}`);
  if (h.location_kr) parts.push(`Location: ${h.location_kr}`);
  if (h.specialties?.length) parts.push(`Specialties: ${h.specialties.join(", ")}`);
  if (h.tags?.length) parts.push(`Tags: ${h.tags.join(", ")}`);
  if (h.doctor_count) parts.push(`Doctor count: ${h.doctor_count}`);
  if (h.operating_hours) parts.push(`Operating hours: ${JSON.stringify(h.operating_hours)}`);
  if (h.amenities?.length) parts.push(`Amenities: ${h.amenities.join(", ")}`);
  if (h.medical_equipment?.length) parts.push(`Equipment: ${h.medical_equipment.join(", ")}`);
  if (h.certifications?.length) parts.push(`Certifications: ${h.certifications.join(", ")}`);
  if (h.external_ratings?.google) {
    parts.push(`Google Rating: ${h.external_ratings.google.rating} (${h.external_ratings.google.count} reviews)`);
  }
  if (h.external_ratings?.website) parts.push(`Website: ${h.external_ratings.website}`);
  if (h.description) parts.push(`Current Description: ${h.description}`);
  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are a medical tourism content specialist for HEALO, a platform connecting international patients with Korean hospitals.

Given hospital data, generate rich content. Respond ONLY with a valid JSON object (no markdown, no code fences).

Required JSON structure:
{
  "description_en": "Compelling English description (2-3 sentences) highlighting key strengths for international patients",
  "description_ko": "Korean description (2-3 sentences)",
  "description_zh": "Chinese (Simplified) description (2-3 sentences)",
  "description_ja": "Japanese description (2-3 sentences)",
  "suggested_treatments": [
    { "name_en": "...", "name_ko": "...", "category": "...", "price_range_usd": "...", "description_en": "..." }
  ],
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "target_patients": ["patient_type_1", "patient_type_2"]
}

Rules:
- suggested_treatments: 3-5 treatments relevant to the hospital's specialties, realistic USD price ranges for Korea
- faq: 3-5 frequently asked questions from international patients, answered helpfully
- highlights: 3-5 key selling points
- target_patients: who would benefit most (e.g. "cosmetic surgery patients from Southeast Asia")
- Be factual based on the data. Don't fabricate specific claims not supported by the input.
- Prices should be realistic Korean medical tourism ranges.`;

export const aiGeneratorSource: EnrichmentSource = {
  id: "ai",
  name: "AI 콘텐츠 생성",
  description: "병원 설명, 예상 시술 메뉴, FAQ, 다국어 콘텐츠 자동 생성",
  icon: "Sparkles",
  requiredEnvKeys: ["GOOGLE_GENERATIVE_AI_API_KEY"],

  isAvailable() {
    return getModel() !== null;
  },

  async enrich(hospital: HospitalRow): Promise<EnrichmentResult> {
    const start = Date.now();
    const model = getModel();

    if (!model) {
      return {
        sourceId: "ai",
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: Date.now() - start },
        error: "LLM 모델이 설정되지 않았습니다",
      };
    }

    try {
      const context = buildHospitalContext(hospital);

      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: context,
        maxOutputTokens: 8000,
        temperature: 0.7,
      });

      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let generated: any;
      try {
        generated = JSON.parse(cleaned);
      } catch {
        generated = tryRepairJson(cleaned);
        if (!generated) {
          console.error("[ai-generator] JSON parse failed. Raw (first 500 chars):", cleaned.slice(0, 500));
          throw new Error("AI 응답 JSON 파싱 실패 (응답이 잘린 것일 수 있음)");
        }
      }
      const items: string[] = [];
      const data: Partial<HospitalRow> = {};

      if (generated.description_en) {
        const existingI18n = hospital.i18n || {};
        data.i18n = {
          ...existingI18n,
          en: {
            ...(existingI18n.en || {}),
            ...(generated.description_en && !existingI18n.en?.description
              ? { description: generated.description_en }
              : {}),
          },
          zh: {
            ...(existingI18n.zh || {}),
            ...(generated.description_zh && !existingI18n.zh?.description
              ? { description: generated.description_zh }
              : {}),
          },
          ja: {
            ...(existingI18n.ja || {}),
            ...(generated.description_ja && !existingI18n.ja?.description
              ? { description: generated.description_ja }
              : {}),
          },
        };
        items.push("i18n:en,zh,ja");
      }

      if (generated.description_ko && !hospital.description) {
        data.description = generated.description_ko;
        items.push("description");
      }

      if (generated.faq?.length && (!hospital.faq || hospital.faq.length === 0)) {
        data.faq = generated.faq.map((f: any) => ({
          question: f.question,
          answer: f.answer,
        }));
        items.push(`faq:${data.faq!.length}`);
      }

      const ext: Record<string, any> = { ...(hospital.external_ratings || {}) };

      if (generated.suggested_treatments?.length) {
        ext.ai_suggested_treatments = generated.suggested_treatments;
        items.push(`treatments:${generated.suggested_treatments.length}`);
      }
      if (generated.highlights?.length) {
        ext.ai_highlights = generated.highlights;
        items.push(`highlights:${generated.highlights.length}`);
      }
      if (generated.target_patients?.length) {
        ext.ai_target_patients = generated.target_patients;
        items.push("target_patients");
      }

      if (Object.keys(ext).length > Object.keys(hospital.external_ratings || {}).length) {
        data.external_ratings = ext;
      }

      return {
        sourceId: "ai",
        success: true,
        data,
        metadata: { itemsCollected: items, duration: Date.now() - start },
      };
    } catch (err: any) {
      console.error("[ai-generator] Error:", err.message, err.stack?.split("\n").slice(0, 3).join("\n"));
      return {
        sourceId: "ai",
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: Date.now() - start },
        error: err.message,
      };
    }
  },
};
