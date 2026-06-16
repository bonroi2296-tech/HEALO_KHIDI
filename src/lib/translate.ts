/**
 * healwith Multilingual Translation Engine
 *
 * Detects the input language, translates to all other supported languages,
 * and stores results in the i18n JSONB column.
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const TRANSLATE_MODEL = "gemini-flash-latest";

export const SUPPORTED_LANGS = ["ko", "en", "zh", "ja", "ru", "kz"] as const;
export type LangCode = (typeof SUPPORTED_LANGS)[number];

// ============================================================
// Language detection
// ============================================================

const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const CJK_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
const HIRAGANA_RE = /[\u3040-\u309F]/;
const KATAKANA_RE = /[\u30A0-\u30FF]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
// Kazakh-specific characters (not in Russian): Ә,Ғ,Қ,Ң,Ө,Ұ,Ү,Һ,І and lowercase
const KAZAKH_SPECIFIC_RE = /[\u0472\u0473\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]/;

export function containsKorean(text: string | null | undefined): boolean {
  if (!text) return false;
  return KOREAN_RE.test(text);
}

export function detectLanguage(text: string | null | undefined): LangCode {
  if (!text) return "en";
  if (KOREAN_RE.test(text)) return "ko";
  if (HIRAGANA_RE.test(text) || KATAKANA_RE.test(text)) return "ja";
  if (CJK_RE.test(text)) return "zh";
  if (CYRILLIC_RE.test(text)) {
    return KAZAKH_SPECIFIC_RE.test(text) ? "kz" : "ru";
  }
  return "en";
}

export function detectPayloadLanguage(payload: Record<string, any>): LangCode {
  const texts: string[] = [];
  for (const key of ["name", "description"]) {
    if (typeof payload[key] === "string" && payload[key]) texts.push(payload[key]);
  }
  for (const key of ["tags", "specialties"]) {
    if (Array.isArray(payload[key])) texts.push(...payload[key].filter((v: any) => typeof v === "string"));
  }
  if (typeof payload.location_kr === "string" && payload.location_kr) texts.push(payload.location_kr);
  const combined = texts.join(" ");
  return detectLanguage(combined);
}

// Keep backward compat
export function anyFieldKorean(payload: Record<string, any>): boolean {
  return detectPayloadLanguage(payload) === "ko";
}

// ============================================================
// Multi-language translation prompt
// ============================================================

function buildSystemPrompt(sourceLang: LangCode, targetLangs: LangCode[]): string {
  const langNames: Record<LangCode, string> = { ko: "Korean", en: "English", zh: "Chinese (Simplified)", ja: "Japanese", ru: "Russian", kz: "Kazakh" };
  const sourceLabel = langNames[sourceLang];
  const targetLabels = targetLangs.map((l) => `"${l}" (${langNames[l]})`).join(", ");

  return `You are a medical translation assistant for healwith, a medical tourism platform.
Translate ${sourceLabel} hospital/treatment data to the following languages: ${targetLabels}.

TRANSLATION RULES:
- "name": Official name in each language. For English, romanize Korean names naturally. For Chinese/Japanese, use appropriate characters.
- "location": Standard address format for each language.
- "description": Natural 1-2 sentence description. Professional and welcoming tone for medical tourists.
- "tags": Standard medical terminology in each language. Hospital types: "상급종합"→"Tertiary Hospital"(en)/"三级综合医院"(zh)/"上級総合病院"(ja), "종합병원"→"General Hospital"/"综合医院"/"総合病院", "의원"→"Clinic"/"诊所"/"クリニック".
- "specialties": Standard medical specialties. Examples: "성형외과"→"Plastic Surgery"/"整形外科"/"整形外科"/"Пластическая хирургия"/"Пластикалық хирургия", "피부과"→"Dermatology"/"皮肤科"/"皮膚科"/"Дерматология"/"Дерматология".

Return ONLY valid JSON with language codes as keys. Each key contains an object with the translated fields.
Example format: { "en": { "name": "...", "description": "..." }, "zh": { "name": "...", "description": "..." } }
Only include fields that were provided in the input. Omit empty fields.`;
}

// ============================================================
// LLM call
// ============================================================

function getModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(TRANSLATE_MODEL) as any;
  }
  return null;
}

interface TranslatableFields {
  name?: string;
  description?: string;
  tags?: string[];
  specialties?: string[];
  location?: string;
}

type MultiLangResult = Partial<Record<LangCode, TranslatableFields>>;

export async function translateToAllLanguages(
  input: TranslatableFields,
  sourceLang: LangCode
): Promise<MultiLangResult | null> {
  const model = getModel();
  if (!model) {
    console.warn("[translate] No LLM API key available, skipping translation");
    return null;
  }

  const compact: Record<string, any> = {};
  if (input.name) compact.name = input.name;
  if (input.description) compact.description = input.description;
  if (input.tags && input.tags.length > 0) compact.tags = input.tags;
  if (input.specialties && input.specialties.length > 0) compact.specialties = input.specialties;
  if (input.location) compact.location = input.location;

  if (Object.keys(compact).length === 0) return null;

  const targetLangs = SUPPORTED_LANGS.filter((l) => l !== sourceLang);

  try {
    const { text } = await generateText({
      model,
      system: buildSystemPrompt(sourceLang, targetLangs),
      prompt: `Source language: ${sourceLang}\nTranslate this data:\n${JSON.stringify(compact)}`,
      temperature: 0.1,
      maxOutputTokens: 4096,
    });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    return JSON.parse(cleaned) as MultiLangResult;
  } catch (err) {
    console.error("[translate] LLM call failed:", (err as Error).message?.slice(0, 200));
    return null;
  }
}

// ============================================================
// Build i18n JSONB from payload and translations
// ============================================================

function extractTranslatableFields(payload: Record<string, any>): TranslatableFields {
  return {
    name: payload.name || undefined,
    description: payload.description || undefined,
    tags: Array.isArray(payload.tags) && payload.tags.length > 0 ? payload.tags : undefined,
    specialties: Array.isArray(payload.specialties) && payload.specialties.length > 0 ? payload.specialties : undefined,
    location: payload.location_kr || payload.location_en || undefined,
  };
}

// ============================================================
// Background translation trigger (multi-language)
// ============================================================

type TableName = "hospitals" | "treatments";

export async function triggerMultiLangTranslation(
  table: TableName,
  id: string,
  payload: Record<string, any>,
  supabaseClient: any
): Promise<void> {
  const sourceLang = detectPayloadLanguage(payload);
  const input = extractTranslatableFields(payload);

  const translations = await translateToAllLanguages(input, sourceLang);
  if (!translations) return;

  // Build the i18n object: source language + all translations
  const i18nUpdate: Record<string, any> = {
    [sourceLang]: input,
  };

  for (const [lang, fields] of Object.entries(translations)) {
    if (fields && Object.keys(fields).length > 0) {
      i18nUpdate[lang] = fields;
    }
  }

  // i18n JSONB만 업데이트 (메인 컬럼은 원본 언어 유지)
  const mainUpdate: Record<string, any> = { i18n: i18nUpdate };

  // location_en은 SEO/폴백용으로 업데이트
  const enData = sourceLang === "en" ? input : translations.en;
  if (enData?.location) mainUpdate.location_en = enData.location;

  const { error } = await supabaseClient.from(table).update(mainUpdate).eq("id", id);

  if (error) {
    console.error(`[translate] DB update failed for ${table}/${id}:`, error.message);
  } else {
    console.log(`[translate] ${table}/${id} translated to: ${Object.keys(i18nUpdate).join(", ")}`);
  }
}

// ============================================================
// Backward compat exports (used by existing API routes)
// ============================================================

export function extractKrFields(payload: Record<string, any>): Record<string, any> {
  const kr: Record<string, any> = {};
  if (payload.name && containsKorean(payload.name)) kr.name_kr = payload.name;
  if (payload.description && containsKorean(payload.description)) kr.description_kr = payload.description;
  if (Array.isArray(payload.tags) && payload.tags.some(containsKorean)) kr.tags_kr = payload.tags;
  if (Array.isArray(payload.specialties) && payload.specialties.some(containsKorean)) kr.specialties_kr = payload.specialties;
  return kr;
}

/** @deprecated Use triggerMultiLangTranslation instead */
export async function triggerTranslation(
  table: TableName,
  id: string,
  koreanPayload: Record<string, any>,
  supabaseClient: any
): Promise<void> {
  return triggerMultiLangTranslation(table, id, koreanPayload, supabaseClient);
}
