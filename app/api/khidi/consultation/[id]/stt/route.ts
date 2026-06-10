/**
 * HEALO: 서버사이드 음성인식 (STT) — 브라우저 무관 음성 자막
 *
 * POST /api/khidi/consultation/:id/stt
 * FormData: audio(블롭, ≤1.5MB·~5초), lang(ko|ru|en|kz|zh|ja)
 * 응답: { ok, transcript }  (말이 없으면 transcript="")
 *
 * 배경: 브라우저 Web Speech API 는 사실상 크롬 전용 (삼성 인터넷·iOS Safari·
 * 인앱 브라우저는 미지원/무음 사망). 마이크 오디오를 짧은 조각으로 받아
 * Gemini 로 전사하면 어떤 브라우저든 음성 자막 가능. 카자흐어도 지원됨
 * (크롬 STT 는 kk 미지원이라 ru 폴백이었음).
 *
 * 인증: resolveConsultationActor — 계정(Bearer) 또는 게스트(X-Guest-Token)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";

const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024; // ~5초 webm/mp4 조각이면 충분

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  ru: "Russian",
  en: "English",
  kz: "Kazakh",
  zh: "Chinese",
  ja: "Japanese",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const access = await resolveConsultationActor(request, consultationId);
    if (!access.success) return access.response;

    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const lang = String(formData.get("lang") || "ko");

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return Response.json({ ok: false, error: "audio_required" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ ok: false, error: "audio_too_large" }, { status: 400 });
    }
    if (audio.size < 1000) {
      // 무음/빈 조각 — 모델 호출 낭비 방지
      return Response.json({ ok: true, transcript: "" });
    }

    const buf = new Uint8Array(await audio.arrayBuffer());
    const mediaType = audio.type && audio.type.startsWith("audio/")
      ? audio.type.split(";")[0]
      : "audio/webm";
    const langName = LANG_NAMES[lang] || "Korean";

    const { text } = await generateText({
      model: google("gemini-flash-latest") as any,
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: buf, mediaType },
            {
              type: "text",
              text: `Transcribe the speech in this audio clip. The speaker is speaking ${langName} during a medical consultation. Output ONLY the verbatim transcript in the original language, nothing else. If there is no clear human speech, output exactly: [NO_SPEECH]`,
            },
          ],
        },
      ],
      temperature: 0,
      maxOutputTokens: 300,
    });

    const raw = (text || "").trim();
    const transcript = raw === "[NO_SPEECH]" || raw.length === 0 ? "" : raw;

    return Response.json({ ok: true, transcript });
  } catch (err: any) {
    console.error("[consultation/stt] error:", err?.message?.slice(0, 200));
    return Response.json({ ok: false, error: "stt_failed" }, { status: 500 });
  }
}
