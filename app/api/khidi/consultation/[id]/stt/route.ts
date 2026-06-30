/**
 * healwith: 서버사이드 음성인식 (STT) — 브라우저 무관 음성 자막
 *
 * POST /api/khidi/consultation/:id/stt
 * FormData: audio(블롭, ≤1.5MB), lang(ko|ru|en|kz|zh|ja), targetLang(선택)
 * 응답: { ok, transcript, translated }  (말이 없으면 둘 다 "")
 *
 * 배경: 브라우저 Web Speech API 는 사실상 크롬 전용 (삼성 인터넷·iOS Safari·
 * 인앱 브라우저는 미지원/무음 사망). 마이크 오디오를 발화 단위 조각으로 받아
 * Gemini 로 전사하면 어떤 브라우저든 음성 자막 가능. 카자흐어도 지원됨.
 *
 * 지연 최적화: targetLang 이 오면 전사+번역을 Gemini 호출 1번으로 처리
 * (기존: 전사 1번 → translate-realtime 1번 = 왕복 2회). 번역 로그도 여기서
 * 저장하므로 클라이언트는 추가 호출 없이 자막 표시만 하면 됨.
 *
 * 인증: resolveConsultationActor — 계정(Bearer) 또는 게스트(X-Guest-Token)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { isFillerOnly } from "@/lib/consultation/fillerFilter";
import { checkConsultationAiGuard } from "@/lib/ai/aiGuard";

const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024;

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  ru: "Russian",
  en: "English",
  kz: "Kazakh",
  zh: "Chinese",
  ja: "Japanese",
};

// 도메인 프라이밍 — 한국어 구어 동음이의 오인식("큰 다리로 컨택"→신체 '다리'), 고유명사 깨짐,
// 코드스위치(카자흐+러시아, 한국어+영어 차용어)를 줄이기 위해 매 호출에 맥락을 주입한다.
const DOMAIN_PRIMING = `Domain: a Korea–CIS medical-tourism teleconsultation (cancer / oncology care). Participants: a Korean doctor, a coordinator, and a foreign patient (often from Kazakhstan or Russia). Frequent proper nouns and business terms appear — hospital names, cancer types, drug/test names, staff names, and words like "바이어"(buyer), "컨택/컨택트"(contact), "에이전시"(agency), "인플루언서"(influencer), and brand names. Treat these as proper nouns; do NOT mis-hear them as unrelated homophones (e.g. "큰 다리" = a big bridge, never the body part "leg"; "유플러스/Uplus" is a company, not "you plus"). The speaker may code-switch (e.g. Kazakh mixed with Russian, or Korean mixed with English loanwords) — transcribe exactly as spoken in whatever languages are used.`;

// 모델 선택: 저자원 카자흐어만 Pro(정확도 격차 큼), 나머지는 Flash 유지(비용·지연).
// env STT_KZ_MODEL 로 override 가능. Pro 별칭이 틀려도 kz 가 죽지 않게 아래 genWithFallback 가 Flash 로 폴백.
function sttModelFor(lang: string): string {
  if (lang === "kz") return process.env.STT_KZ_MODEL || "gemini-pro-latest";
  return "gemini-flash-latest";
}

async function genWithFallback(
  modelId: string,
  args: { messages: any; temperature: number; maxOutputTokens: number }
): Promise<string> {
  try {
    const { text } = await generateText({ model: google(modelId) as any, ...args });
    return text || "";
  } catch (e) {
    // Pro 등 비-Flash 모델이 실패하면(별칭 오류·쿼터 등) Flash 로 1회 폴백 — kz 자막이 끊기지 않게.
    if (modelId !== "gemini-flash-latest") {
      const { text } = await generateText({
        model: google("gemini-flash-latest") as any,
        ...args,
      });
      return text || "";
    }
    throw e;
  }
}

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
    const targetLangRaw = String(formData.get("targetLang") || "");
    const targetLang = LANG_NAMES[targetLangRaw] ? targetLangRaw : "";

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return Response.json({ ok: false, error: "audio_required" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ ok: false, error: "audio_too_large" }, { status: 400 });
    }
    if (audio.size < 1000) {
      // 무음/빈 조각 — 모델 호출 낭비 방지
      return Response.json({ ok: true, transcript: "", translated: "" });
    }

    // 비용 가드 (상담 안 끊는 높은 천장 — 유료키 전환 시 봇·루프발 청구 폭주 backstop)
    const guard = await checkConsultationAiGuard(consultationId, "/api/khidi/consultation/:id/stt");
    if (!guard.allowed) {
      return Response.json({ ok: false, error: guard.code }, { status: guard.status });
    }

    const buf = new Uint8Array(await audio.arrayBuffer());
    const mediaType = audio.type && audio.type.startsWith("audio/")
      ? audio.type.split(";")[0]
      : "audio/webm";
    const langName = LANG_NAMES[lang] || "Korean";

    let transcript = "";
    let translated = "";

    if (targetLang && targetLang !== lang) {
      // ── 전사+번역 단일 호출 — 왕복 1회로 자막 지연 절반 ──
      const targetName = LANG_NAMES[targetLang];
      const text = await genWithFallback(sttModelFor(lang), {
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: buf, mediaType },
              {
                type: "text",
                text: `${DOMAIN_PRIMING}
The speaker is speaking ${langName} (may include code-switching).
1. Transcribe the speech verbatim in the original language(s), but OMIT hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと"). Keep all meaningful words and proper nouns exactly.
2. Translate the transcript into ${targetName} — formal/polite register, standard medical terminology, concise (for real-time subtitles).
Respond with ONLY this JSON on one line, no markdown, no code fences:
{"t":"<transcript>","x":"<translation>"}
If there is no clear human speech, or the speech is ONLY hesitation fillers with no content, respond exactly: {"t":"","x":""}`,
              },
            ],
          },
        ],
        temperature: 0,
        maxOutputTokens: 800,
      });

      // 모델이 코드펜스로 감싸는 경우 대비해 벗긴 뒤 JSON 추출
      const cleaned = (text || "").replace(/```(?:json)?/g, "").trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const j = JSON.parse(m[0]);
          transcript = String(j.t || "").trim();
          translated = String(j.x || "").trim();
        } catch {
          // 파싱 실패 — 조각 폐기 (깨진 텍스트를 자막으로 내보내는 것보다 안전)
        }
      }
    } else {
      // ── 전사만 (targetLang 없음 또는 같은 언어) ──
      const text = await genWithFallback(sttModelFor(lang), {
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: buf, mediaType },
              {
                type: "text",
                text: `${DOMAIN_PRIMING}
Transcribe the speech in this audio clip. The speaker is speaking ${langName} (may include code-switching) during a medical consultation. Output ONLY the transcript in the original language(s), nothing else. OMIT hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと") but keep all meaningful words and proper nouns exactly. If there is no clear human speech, or the speech is ONLY hesitation fillers, output exactly: [NO_SPEECH]`,
              },
            ],
          },
        ],
        temperature: 0,
        maxOutputTokens: 400,
      });
      const raw = (text || "").trim();
      transcript = raw === "[NO_SPEECH]" ? "" : raw;
      // 같은 언어면 자막 파이프라인이 그대로 표시할 수 있게 번역=원문
      if (targetLang === lang) translated = transcript;
    }

    // 2차 필터: 모델이 프롬프트 지시를 어기고 추임새만 전사해 와도 자막으로 안 내보냄
    if (transcript && isFillerOnly(transcript)) {
      transcript = "";
      translated = "";
    }

    // 번역 로그 저장 — translate-realtime 와 동일 테이블/형식 (fire-and-forget)
    if (transcript && translated && targetLang) {
      saveTranslationLog(consultationId, {
        originalText: transcript,
        translatedText: translated,
        sourceLang: lang,
        targetLang,
      }).catch((err: any) =>
        console.error("[consultation/stt] DB save error:", err?.message?.slice(0, 200))
      );
    }

    return Response.json({ ok: true, transcript, translated });
  } catch (err: any) {
    console.error("[consultation/stt] error:", err?.message?.slice(0, 200));
    return Response.json({ ok: false, error: "stt_failed" }, { status: 500 });
  }
}

async function saveTranslationLog(
  consultationId: string,
  data: {
    originalText: string;
    translatedText: string;
    sourceLang: string;
    targetLang: string;
  }
) {
  const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
  const supabase = getSupabaseServerClient();

  await supabase.from("consultation_translations").insert([
    {
      session_id: consultationId,
      source_text: data.originalText,
      translated_text: data.translatedText,
      source_lang: data.sourceLang,
      target_lang: data.targetLang,
    },
  ]);
}
