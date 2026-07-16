/**
 * healwith: 전문의 소견 → 환자 언어 번역 (문서 1건 통번역, JSON 래핑 없음)
 *
 * src/lib/translate/shortText.ts(translateNotes)는 "짧은 메모 여러 개"를 JSON 배열로 묶어 번역하는
 * 용도라, 소견서처럼 긴 자유서술 문서를 넣으면 모델이 JSON 형식을 못 지켜 파싱 실패한다(실측 2026-07-09).
 * 여기는 평문 번역만 받아서 그 실패 모드 자체가 없다. 코디용 수동 재번역 라우트와 접수 시점
 * 자동번역(둘 다)이 이 함수 하나를 공유한다.
 */
import "server-only";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { logAiUsage } from "@/lib/ai/usageLog";
import { isNoteTargetLang } from "@/lib/translate/shortText";

const MODEL = "gemini-flash-latest";
const LANG_NAME: Record<string, string> = {
  en: "English", ru: "Russian", kz: "Kazakh", zh: "Chinese (Simplified)", ja: "Japanese",
};

export async function translateOpinionText(text: string, lang: string): Promise<string | null> {
  const t = (text || "").trim();
  if (!t) return null;
  if (!isNoteTargetLang(lang)) return null; // ko 등 번역 불필요
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;

  try {
    const { text: translated, usage } = await generateText({
      model: google(MODEL) as any,
      system:
        `You translate a Korean doctor's second-opinion letter for a cancer medical-tourism patient into ${LANG_NAME[lang]}. ` +
        `Translate the ENTIRE text faithfully and naturally, section by section — do not summarize or omit anything. ` +
        `Keep numbers, dates, units, hospital/drug names, and Latin medical abbreviations unchanged. ` +
        `Return ONLY the translated text, no preamble, no explanation, no markdown fences.`,
      prompt: t.slice(0, 8000),
      temperature: 0.1,
      maxOutputTokens: 8192,
    });
    void logAiUsage({ surface: "opinion_translate", model: MODEL, usage, meta: { lang, chars: t.length } });
    return translated.trim() || null;
  } catch (e: any) {
    console.error("[translateOpinionText] failed:", e?.message?.slice(0, 160));
    return null;
  }
}
