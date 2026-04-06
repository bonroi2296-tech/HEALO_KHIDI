/**
 * Real-time Translation API (Streaming)
 *
 * POST /api/khidi/consultation/translate-realtime
 * Body: { text, sourceLang, targetLang, consultationId?, speakerRole? }
 *
 * Uses Gemini 2.5 Flash for low-latency medical translation.
 * Returns streamed translation text + saves to DB if consultationId provided.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  ru: "Russian",
  en: "English",
  kz: "Kazakh",
  zh: "Chinese",
  ja: "Japanese",
};

function buildPrompt(sourceLang: string, targetLang: string): string {
  const src = LANG_NAMES[sourceLang] || sourceLang;
  const tgt = LANG_NAMES[targetLang] || targetLang;

  return `You are a real-time medical interpreter for a telemedicine consultation between a Korean hospital doctor and a foreign patient.

Translate the following ${src} text to ${tgt}.

RULES:
- Translate naturally and accurately, preserving medical terminology
- Use formal/polite register appropriate for doctor-patient communication
- For medical terms, use the standard term in the target language
- Keep the translation concise — this is for real-time subtitles
- Output ONLY the translated text, nothing else — no quotes, no explanations`;
}

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang, targetLang, consultationId, speakerRole } =
      await request.json();

    if (!text || !sourceLang || !targetLang) {
      return Response.json(
        { ok: false, error: "text, sourceLang, targetLang are required" },
        { status: 400 }
      );
    }

    // Skip if same language
    if (sourceLang === targetLang) {
      return Response.json({ ok: true, translated: text });
    }

    const { text: translated } = await generateText({
      model: google("gemini-2.5-flash") as any,
      system: buildPrompt(sourceLang, targetLang),
      prompt: text,
      temperature: 0.1,
      maxTokens: 500,
    });

    const translatedText = translated.trim();

    // Save to DB if consultationId provided (fire-and-forget)
    if (consultationId) {
      saveTranslationLog(consultationId, {
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        speakerRole: speakerRole || "unknown",
      }).catch((err) =>
        console.error("[translate-realtime] DB save error:", err.message)
      );
    }

    return Response.json({
      ok: true,
      translated: translatedText,
      sourceLang,
      targetLang,
    });
  } catch (error: any) {
    console.error("[translate-realtime] Error:", error.message?.slice(0, 200));
    return Response.json(
      { ok: false, error: "Translation failed" },
      { status: 500 }
    );
  }
}

async function saveTranslationLog(
  consultationId: string,
  data: {
    originalText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
    speakerRole: string;
  }
) {
  const { getSupabaseServerClient } = await import(
    "../../../../../src/lib/data/supabaseServerClient"
  );
  const supabase = getSupabaseServerClient();

  await supabase.from("consultation_translations").insert([
    {
      consultation_id: parseInt(consultationId),
      original_text: data.originalText,
      translated_text: data.translatedText,
      source_language: data.sourceLang,
      target_language: data.targetLang,
      speaker_role: data.speakerRole,
      translation_method: "gemini-2.5-flash",
    },
  ]);
}
