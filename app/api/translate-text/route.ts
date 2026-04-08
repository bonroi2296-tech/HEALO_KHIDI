export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", ru: "Russian", kz: "Kazakh",
};

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLang } = await request.json();

    if (!Array.isArray(texts) || !targetLang || !LANG_NAMES[targetLang]) {
      return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
    }
    if (texts.length > 10) {
      return NextResponse.json({ ok: false, error: "too_many" }, { status: 400 });
    }

    const { text: result } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Translate these ${texts.length} texts to ${LANG_NAMES[targetLang]}. Return ONLY a JSON array of translated strings in the same order. No explanation.\n\n${JSON.stringify(texts)}`,
    });

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: "parse_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, translations: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    console.error("[translate-text]", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
