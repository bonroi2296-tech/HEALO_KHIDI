/**
 * Batch Translation Script
 *
 * i18n이 null인 모든 hospitals/treatments 레코드를 Gemini로 번역합니다.
 *
 * 사용법: node scripts/batch-translate-all.mjs
 * 필요 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey
);

const llmModel = google("gemini-flash-latest");

const SUPPORTED_LANGS = ["ko", "en", "zh", "ja", "ru", "kz"];

// ── Language detection ──
const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
const HIRAGANA_RE = /[\u3040-\u309F]/;
const KATAKANA_RE = /[\u30A0-\u30FF]/;
const CJK_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;

function detectLanguage(text) {
  if (!text) return "en";
  if (KOREAN_RE.test(text)) return "ko";
  if (HIRAGANA_RE.test(text) || KATAKANA_RE.test(text)) return "ja";
  if (CJK_RE.test(text)) return "zh";
  return "en";
}

function detectPayloadLang(record) {
  const texts = [record.name, record.description, record.location_kr].filter(Boolean);
  if (record.tags) texts.push(...record.tags);
  if (record.specialties) texts.push(...record.specialties);
  return detectLanguage(texts.join(" "));
}

// ── Translation prompt ──
function buildSystemPrompt(sourceLang, targetLangs) {
  const langNames = { ko: "Korean", en: "English", zh: "Chinese (Simplified)", ja: "Japanese", ru: "Russian", kz: "Kazakh" };
  const sourceLabel = langNames[sourceLang];
  const targetLabels = targetLangs.map((l) => `"${l}" (${langNames[l]})`).join(", ");

  return `You are a medical translation assistant for HEALO-KHIDI, a medical tourism platform.
Translate ${sourceLabel} hospital/treatment data to: ${targetLabels}.

RULES:
- "name": Official name in each language. For English, romanize Korean names naturally.
- "location": Standard address format for each language.
- "description": Natural 1-2 sentence description. Professional medical tourism tone.
- "tags": Standard medical terminology. Hospital types: "상급종합"→"Tertiary Hospital"(en)/"三级综合医院"(zh)/"上級総合病院"(ja), "종합병원"→"General Hospital"/"综合医院"/"総合病院", "의원"→"Clinic"/"诊所"/"クリニック".
- "specialties": Standard medical specialties in each language.

Return ONLY valid JSON: { "en": { "name": "...", ... }, "zh": { ... } }
Only include fields provided in input. Omit empty fields.`;
}

async function translateRecord(record) {
  const sourceLang = detectPayloadLang(record);
  const input = {};
  if (record.name) input.name = record.name;
  if (record.description) input.description = record.description;
  if (record.tags?.length) input.tags = record.tags;
  if (record.specialties?.length) input.specialties = record.specialties;
  if (record.location_kr) input.location = record.location_kr;
  else if (record.location_en) input.location = record.location_en;

  if (Object.keys(input).length === 0) return null;

  const targetLangs = SUPPORTED_LANGS.filter((l) => l !== sourceLang);

  const { text: rawText } = await generateText({
    model: llmModel,
    system: buildSystemPrompt(sourceLang, targetLangs),
    prompt: `Source language: ${sourceLang}\nTranslate this data:\n${JSON.stringify(input)}`,
    temperature: 0.1,
    maxTokens: 4096,
  });

  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const translations = JSON.parse(text);

  // Build full i18n: source + translations
  const i18n = { [sourceLang]: input };
  for (const [lang, fields] of Object.entries(translations)) {
    if (fields && Object.keys(fields).length > 0) {
      i18n[lang] = fields;
    }
  }
  return i18n;
}

// ── Add missing languages to existing i18n ──
async function addMissingLangs(table, targetLangs) {
  console.log(`\n=== ${table} (add: ${targetLangs.join(", ")}) ===`);

  const selectCols = table === "hospitals"
    ? "id,name,slug,description,tags,specialties,location_kr,location_en,i18n"
    : "id,name,slug,description,tags,i18n";

  const { data: records, error } = await supabase
    .from(table)
    .select(selectCols)
    .not("i18n", "is", null);

  if (error) {
    console.error(`  Failed to fetch ${table}:`, error.message);
    return { success: 0, failed: 0 };
  }

  // Filter to records missing at least one target lang
  const needsUpdate = records.filter((r) =>
    targetLangs.some((lang) => !r.i18n?.[lang])
  );
  console.log(`  Found ${needsUpdate.length}/${records.length} records needing ${targetLangs.join("/")}`);

  let success = 0, failed = 0;

  for (const record of needsUpdate) {
    try {
      const missingLangs = targetLangs.filter((lang) => !record.i18n?.[lang]);
      if (missingLangs.length === 0) continue;

      const sourceLang = detectPayloadLang(record);
      const input = {};
      if (record.name) input.name = record.name;
      if (record.description) input.description = record.description;
      if (record.tags?.length) input.tags = record.tags;
      if (record.specialties?.length) input.specialties = record.specialties;
      if (record.location_kr) input.location = record.location_kr;
      else if (record.location_en) input.location = record.location_en;

      if (Object.keys(input).length === 0) continue;

      const { text: rawText } = await generateText({
        model: llmModel,
        system: buildSystemPrompt(sourceLang, missingLangs),
        prompt: `Source language: ${sourceLang}\nTranslate this data:\n${JSON.stringify(input)}`,
        temperature: 0.1,
        maxTokens: 4096,
      });

      let text = rawText.trim();
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const translations = JSON.parse(text);

      // Merge into existing i18n
      const merged = { ...record.i18n };
      for (const [lang, fields] of Object.entries(translations)) {
        if (fields && Object.keys(fields).length > 0) {
          merged[lang] = fields;
        }
      }

      const { error: updateErr } = await supabase
        .from(table)
        .update({ i18n: merged })
        .eq("id", record.id);

      if (updateErr) {
        console.error(`  ❌ ${record.slug || record.id}:`, updateErr.message);
        failed++;
      } else {
        console.log(`  ✅ ${record.slug || record.id} +${missingLangs.join(",")}`);
        success++;
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ❌ ${record.slug || record.id}:`, err.message?.slice(0, 150));
      failed++;
    }
  }

  return { success, failed };
}

// ── Main ──
async function processTable(table) {
  console.log(`\n=== ${table} ===`);

  const selectCols = table === "hospitals"
    ? "id,name,slug,description,tags,specialties,location_kr,location_en,i18n"
    : "id,name,slug,description,tags,i18n";

  const { data: records, error } = await supabase
    .from(table)
    .select(selectCols)
    .is("i18n", null);

  if (error) {
    console.error(`  Failed to fetch ${table}:`, error.message);
    return { success: 0, failed: 0 };
  }

  console.log(`  Found ${records.length} records with i18n = null`);
  let success = 0, failed = 0;

  for (const record of records) {
    try {
      const i18n = await translateRecord(record);
      if (!i18n) {
        console.log(`  ⏭ ${record.slug || record.id} — no translatable fields`);
        continue;
      }

      const updateData = { i18n };
      const enData = i18n.en;
      if (enData?.location && !record.location_en) {
        updateData.location_en = enData.location;
      }

      const { error: updateErr } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", record.id);

      if (updateErr) {
        console.error(`  ❌ ${record.slug || record.id}:`, updateErr.message);
        failed++;
      } else {
        console.log(`  ✅ ${record.slug || record.id} → ${Object.keys(i18n).join(", ")}`);
        success++;
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ❌ ${record.slug || record.id}:`, err.message?.slice(0, 150));
      failed++;
    }
  }

  return { success, failed };
}

async function main() {
  console.log("=== Batch Translation (Gemini 2.5 Flash) ===");
  console.log(`Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)}...`);

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY 환경변수가 필요합니다");
    process.exit(1);
  }

  // Step 1: Translate records with no i18n at all
  const hospitals = await processTable("hospitals");
  const treatments = await processTable("treatments");

  console.log("\n--- Phase 1 (신규 번역) ---");
  console.log(`  Hospitals: ${hospitals.success} 성공, ${hospitals.failed} 실패`);
  console.log(`  Treatments: ${treatments.success} 성공, ${treatments.failed} 실패`);

  // Step 2: Add missing languages (ru, kz) to existing i18n records
  const hospitalsAdd = await addMissingLangs("hospitals", ["ru", "kz"]);
  const treatmentsAdd = await addMissingLangs("treatments", ["ru", "kz"]);

  console.log("\n--- Phase 2 (ru/kz 추가) ---");
  console.log(`  Hospitals: ${hospitalsAdd.success} 성공, ${hospitalsAdd.failed} 실패`);
  console.log(`  Treatments: ${treatmentsAdd.success} 성공, ${treatmentsAdd.failed} 실패`);

  console.log("\n=== 완료 ===");
}

main().catch(console.error);
