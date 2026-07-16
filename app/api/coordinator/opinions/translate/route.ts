/**
 * healwith: 전문의 소견 — 에이전시 공개용 확정본 AI 번역 (코디·어드민 전용)
 *
 * POST /api/coordinator/opinions/translate  { text: string, lang: "en"|"ru"|"kz"|"zh"|"ja" }
 *   → { ok, translated }  (한글 아니거나 대상언어 미지원이면 원문 그대로 반환 — 코디가 그대로 써도 무해)
 *
 * PO 결정(2026-07-09): 원장 소견은 한글 기반 → AI 1차 번역 → 코디 2차 교정 → 공개.
 * "공개"는 여전히 코디가 draft를 직접 눌러야만 발생(이 라우트는 초안만 만들어줌, 저장 안 함).
 *
 * ⚠️ src/lib/translate/shortText.ts(translateNotes)는 "짧은 메모 여러 개"를 JSON 배열로 묶어 번역하는
 * 용도라, 소견서처럼 긴 자유서술 문서를 넣으면 모델이 JSON 형식을 못 지켜 파싱 실패한다(실측: 2026-07-09
 * 실케이스에서 "Unexpected token" 파싱 에러 발생). 여기는 "문서 1건 통번역"이라 JSON 래핑 없이
 * 평문 번역만 받는다 — 실패 모드 자체가 사라짐.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { isNoteTargetLang } from "@/lib/translate/shortText";
import { logAiUsage } from "@/lib/ai/usageLog";

const MODEL = "gemini-flash-latest";
const LANG_NAME: Record<string, string> = {
  en: "English", ru: "Russian", kz: "Kazakh", zh: "Chinese (Simplified)", ja: "Japanese",
};

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.slice(0, 8000).trim() : "";
  const lang = body?.lang;
  if (!text) return Response.json({ ok: false, error: "empty_text" }, { status: 400 });
  if (!isNoteTargetLang(lang)) {
    return Response.json({ ok: true, translated: text }); // ko 등 번역 불필요 — 원문 그대로
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ ok: false, error: "no_api_key" }, { status: 500 });
  }

  try {
    const { text: translated, usage } = await generateText({
      model: google(MODEL) as any,
      system:
        `You translate a Korean doctor's second-opinion letter for a cancer medical-tourism patient into ${LANG_NAME[lang]}. ` +
        `Translate the ENTIRE text faithfully and naturally, section by section — do not summarize or omit anything. ` +
        `Keep numbers, dates, units, hospital/drug names, and Latin medical abbreviations unchanged. ` +
        `Return ONLY the translated text, no preamble, no explanation, no markdown fences.`,
      prompt: text,
      temperature: 0.1,
      maxOutputTokens: 8192,
    });

    void logAiUsage({ surface: "opinion_translate", model: MODEL, usage, meta: { lang, chars: text.length } });

    const out = translated.trim();
    return Response.json({ ok: true, translated: out || text });
  } catch (e: any) {
    console.error("[coordinator/opinions/translate] error:", e?.message?.slice(0, 160));
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
