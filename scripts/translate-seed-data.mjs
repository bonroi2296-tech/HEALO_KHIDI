/**
 * Translate existing Myeonryeok seed data to all supported languages (ko, en, zh, ja).
 * Uses Google Generative AI API directly.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function callGemini(systemPrompt, userPrompt) {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse JSON from LLM response");
  }
}

const SYSTEM_PROMPT = `You are a medical translation assistant for HEALO, a medical tourism platform.
Given hospital/treatment data in English, translate to Korean (ko), Chinese Simplified (zh), and Japanese (ja).

TRANSLATION RULES:
- "name": Natural localized name. Keep brand names (like "Myeonryeok") in their original form or use common local equivalents.
- "description": Natural 1-2 sentence description. Professional and welcoming tone for medical tourists.
- "full_description": Full detailed description preserving all bullet points and structure.
- "tags": Standard medical terminology in each language.
- "specialties": Standard medical specialties in each language.
- "location": Standard address format for each language.
- Keep Korean Medicine terms like 한방, 침술, 한약 in Korean, and use their standard equivalents in zh/ja.

Return ONLY valid JSON with language codes as keys: { "ko": {...}, "zh": {...}, "ja": {...} }
Include the same fields that were provided in the input.`;

async function translateRecord(record, type) {
  const input = {};
  if (record.name) input.name = record.name;
  if (record.description) input.description = record.description;
  if (record.tags?.length) input.tags = record.tags;
  if (record.specialties?.length) input.specialties = record.specialties;
  if (record.location_en) input.location = record.location_en;

  console.log(`  Translating: ${record.name}`);
  const translations = await callGemini(
    SYSTEM_PROMPT,
    `This is a ${type} record. Translate to ko, zh, ja:\n${JSON.stringify(input)}`
  );

  const i18n = {
    en: input,
    ...translations,
  };

  return i18n;
}

async function main() {
  console.log("=== Translating Myeonryeok Seed Data ===\n");

  const singleSlug = process.argv.find(a => a.startsWith("--slug="))?.split("=")[1];

  // Fetch Myeonryeok hospitals
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("*")
    .ilike("name", "%Myeonryeok%");

  console.log(`Found ${hospitals?.length || 0} Myeonryeok hospitals\n`);

  for (const h of hospitals || []) {
    try {
      const i18n = await translateRecord(h, "hospital");
      const { error } = await supabase
        .from("hospitals")
        .update({ i18n })
        .eq("id", h.id);
      if (error) {
        console.error(`    DB update failed: ${error.message}`);
      } else {
        console.log(`    Updated i18n for: ${h.name}`);
      }
    } catch (e) {
      console.error(`    Translation failed for ${h.name}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Fetch treatments linked to Myeonryeok hospitals
  const hospitalIds = (hospitals || []).map((h) => h.id);
  if (hospitalIds.length === 0) {
    console.log("No hospitals found, skipping treatments.");
    return;
  }

  let tQuery = supabase.from("treatments").select("*").in("hospital_id", hospitalIds);
  if (singleSlug) tQuery = tQuery.eq("slug", singleSlug);
  const { data: treatments } = await tQuery;

  console.log(`\nFound ${treatments?.length || 0} Myeonryeok treatments\n`);

  for (const t of treatments || []) {
    try {
      const i18n = await translateRecord(t, "treatment");
      const { error } = await supabase
        .from("treatments")
        .update({ i18n })
        .eq("id", t.id);
      if (error) {
        console.error(`    DB update failed: ${error.message}`);
      } else {
        console.log(`    Updated i18n for: ${t.name}`);
      }
    } catch (e) {
      console.error(`    Translation failed for ${t.name}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n=== Translation Complete ===");
}

main().catch(console.error);
