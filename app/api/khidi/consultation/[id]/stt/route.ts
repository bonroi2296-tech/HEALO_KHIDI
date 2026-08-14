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

import { encryptTranscriptRow } from "@/lib/consultation/transcriptCrypto";
import { NextRequest } from "next/server";
import { generateText } from "ai";
import { callGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";
import { google } from "@ai-sdk/google";
import { resolveConsultationActor } from "@/lib/auth/requireConsultationAccess";
import { isFillerOnly } from "@/lib/consultation/fillerFilter";
import { checkConsultationAiGuard } from "@/lib/ai/aiGuard";
import { STT_ENGINES } from "@/lib/consultation/sttEngine";

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
//
// ⚠️ 2026-08-03 실측으로 «내용을 알려주는 문장»을 걷어냈다. 예전 문구는 방에 누가 있는지까지
//    적어 줬다 — "참가자: 한국인 의사, 코디네이터, 그리고 **주로 카자흐스탄·러시아에서 온
//    외국인 환자**", 그리고 "**직원 이름**·병원 이름이 자주 나온다".
//    소리가 흐리거나 문장이 잘리면 모델은 그 설명을 **재료로 삼아 지어냈다.** 2대 동시 발화
//    실측(46줄)에서 나온 지어냄 8줄이 정확히 그 모양이었다:
//      · "안녕하세요, 저는 아나르굴입니다. 카자흐스탄에서 왔습니다." (아무도 안 한 말)
//      · "from Seoul." → "from Seoul National University Hospital." (없는 병원명 완성)
//    금지 문구는 이미 있었는데도 그랬다 — **금지보다 먼저 읽히는 「누가 있는지」 설명이
//    지어낼 거리를 쥐여 주고 있었다.** 그래서 금지를 강화하는 대신 재료를 없앴다.
//    남긴 것: 동음이의·차용어 구분(이건 과거 실측으로 효과가 확인된 부분).
const DOMAIN_PRIMING = `Domain: a Korea–CIS medical-tourism teleconsultation (cancer / oncology care). Korean, Russian, Kazakh and English may all be spoken, sometimes code-switched inside one sentence — transcribe exactly as spoken, in whatever languages are actually used. When a word is genuinely ambiguous, prefer the medical/business reading over an unrelated homophone (e.g. "큰 다리" = a big bridge, never the body part "leg"; "유플러스/Uplus" is a company, not "you plus"; "바이어"=buyer, "컨택/컨택트"=contact, "에이전시"=agency, "인플루언서"=influencer). This is disambiguation guidance ONLY — it tells you how to read what you hear, never what to expect.`;

// 지어냄 금지 — **두 프롬프트 모두**에 넣는다.
// 왜 상수로 뺐나: 예전엔 JSON 경로(전사+번역)에만 있었고 «전사만» 경로에는 한 줄도 없었다.
//   그 경로는 출발어와 도착어가 같을 때 돈다(같은 언어끼리 회의 = 흔한 경우) — 즉 금지가
//   통째로 빠진 채로 돌던 자리가 실제로 있었다. 한 곳에만 적으면 또 갈라진다.
const NO_INVENTION = `TRANSCRIBE ONLY WHAT IS ACTUALLY AUDIBLE. This is a medical setting — invented content is dangerous and will be stored in the patient's consultation record.
- The clip may start or end mid-sentence. Keep the fragment exactly as heard; NEVER add words to complete a cut-off sentence.
- NEVER add a person's name, nationality, hospital, diagnosis, or greeting that you did not actually hear, even when the domain makes it plausible.
- If the audio is only silence, breathing, background noise, or music, return the empty result — do NOT produce "Здравствуйте"/"안녕하세요" or any filler phrase.
- When in doubt, output LESS. A short faithful fragment is correct; a fluent invented sentence is a failure.`;

// 대화 문맥(직전 발화) — 클라이언트 링버퍼에서 FormData 로 전달. 전사(동음이의)·번역(대명사)
// 양쪽 정확도에 기여. 개수·길이 상한으로 프롬프트 오염 방지.
// (translate-realtime 와 중복 구현 — 공유 모듈화는 후속 과제, docs/KNOWN_ISSUES.md)
const MAX_CONTEXT_ITEMS = 6;
const MAX_CONTEXT_ITEM_CHARS = 300;

function parseContext(raw: unknown): string {
  let items: any[] = [];
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    return "";
  }
  const lines = items
    .slice(-MAX_CONTEXT_ITEMS)
    .map((it: any) => ({
      speaker: it?.speaker === "other" ? "other" : "self",
      lang: typeof it?.lang === "string" && LANG_NAMES[it.lang] ? it.lang : "",
      text: typeof it?.text === "string" ? it.text.slice(0, MAX_CONTEXT_ITEM_CHARS) : "",
    }))
    .filter((it) => it.text)
    .map((it) => `[${it.speaker}${it.lang ? `, ${it.lang}` : ""}] ${it.text}`);
  if (!lines.length) return "";
  return `Recent conversation (oldest first) — for context ONLY, do NOT transcribe or translate it:
${lines.join("\n")}
Use it to resolve pronouns, omitted subjects, homophones, and to keep terminology, names, numbers, and the direction of payments/actions consistent.

`;
}

// 모델 선택: 저자원 카자흐어만 Pro(정확도 격차 큼), 나머지는 Flash 유지(비용·지연).
// env STT_KZ_MODEL 로 override 가능. Pro 별칭이 틀려도 kz 가 죽지 않게 아래 genWithFallback 가 Flash 로 폴백.
// ⚠️ 언어 자동 감지 도입(2026-07-11) 후엔 '설정 언어'만으론 부족 — 같은 마이크에 카자흐어가
// 섞여 들어올 수 있는 세션(lang 또는 targetLang 이 kz)이면 Pro 를 쓴다. 안 그러면 공유 마이크의
// 카자흐 발화가 Flash 로 떨어져, kz 경로에 Pro 를 도입한 이유(정확도 격차)가 도로 사라짐.
// partial(말하는 중 조각)은 어차피 확정본이 곧 교체하므로 **항상 Flash** — Pro 는 응답이
// 느려 «빨리 보여준다»는 목적 자체를 깎아먹는다. 정확도가 필요한 확정본만 kz→Pro.
function sttModelFor(lang: string, targetLang?: string, isPartial?: boolean): string {
  if (isPartial) return "gemini-flash-latest";
  if (lang === "kz" || targetLang === "kz")
    return process.env.STT_KZ_MODEL || "gemini-pro-latest";
  return "gemini-flash-latest";
}

async function genWithFallback(
  modelId: string,
  args: { messages: any; temperature: number; maxOutputTokens: number }
): Promise<string> {
  try {
    // 별칭 세대 교체 생존 사다리 — temperature 폐기(2026-07-21 공지)·thinking 거절을 흡수.
    // 자막은 실시간이라 400 한 번에 통째로 끊기면 회의가 못 돌아간다.
    const { text } = await callGeminiWithCompat((p) => generateText(p as any), {
      model: google(modelId) as any,
      ...args,
    });
    return text || "";
  } catch (e) {
    // Pro 등 비-Flash 모델이 실패하면(별칭 오류·쿼터 등) Flash 로 1회 폴백 — kz 자막이 끊기지 않게.
    if (modelId !== "gemini-flash-latest") {
      const { text } = await callGeminiWithCompat((p) => generateText(p as any), {
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
    const contextBlock = parseContext(formData.get("context"));
    // 화자 표시 이름 — 기록에 "누가 말했나"를 남긴다(없던 컬럼, 2026-07-27).
    const speakerName = String(formData.get("speakerName") || "").trim().slice(0, 80) || null;
    // partial=1 → 말하는 중 조각. 화면에만 띄우고 기록·DB 에는 남기지 않는다
    // (같은 발화가 조각 수만큼 기록에 쌓이면 회의록이 통째로 오염된다).
    const isPartial = String(formData.get("partial") || "") === "1";

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

    let detectedLang = "";

    if (targetLang && targetLang !== lang) {
      // ── 전사+번역 단일 호출 — 왕복 1회로 자막 지연 절반 ──
      // 언어 자동 감지: 화자가 설정 언어(lang)와 다른 언어를 말해도(같은 방 마이크에
      // 한국어·카자흐어 혼용, 언어 설정 실수 등) 실제 감지 언어 → targetLang 으로 번역.
      // 감지 언어가 이미 targetLang 이면 번역하지 않고 전사를 그대로 자막으로 (echo 방지 —
      // 7/10 로그 전수조사에서 한국어 발화가 ru→ko 로 들어가 원문 그대로 echo 된 건 10건).
      const targetName = LANG_NAMES[targetLang];
      const text = await genWithFallback(sttModelFor(lang, targetLang, isPartial), {
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: buf, mediaType },
              {
                type: "text",
                text: `${DOMAIN_PRIMING}
${contextBlock}The speaker most likely speaks ${langName}, but this microphone may be shared by people speaking different languages — DETECT the language actually spoken (candidates: Korean ko, Russian ru, English en, Kazakh kz, Chinese zh, Japanese ja; prefer ${langName}/${targetName} when ambiguous).
1. Transcribe the speech verbatim in the original language(s), but OMIT hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと"). Keep all meaningful words and proper nouns exactly.
2. If the detected language is already ${targetName}, set "x" to the transcript itself (do NOT translate). Otherwise translate the transcript into ${targetName} — formal/polite register, standard medical terminology, concise (for real-time subtitles).
${NO_INVENTION}
Respond with ONLY this JSON on one line, no markdown, no code fences:
{"t":"<transcript>","x":"<translation>","l":"<detected language code>"}
If there is no clear human speech, or the speech is ONLY hesitation fillers with no content, respond exactly: {"t":"","x":"","l":""}`,
              },
            ],
          },
        ],
        temperature: 0,
        // 응답 지연은 사실상 «출력 토큰 수»가 좌우한다. 부분 조각은 1~2초짜리라
        // 나올 글자도 적으므로 상한을 낮춰 꼬리 지연(장황한 응답)을 잘라낸다.
        maxOutputTokens: isPartial ? 300 : 800,
      });

      // 모델이 코드펜스로 감싸는 경우 대비해 벗긴 뒤 JSON 추출
      const cleaned = (text || "").replace(/```(?:json)?/g, "").trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const j = JSON.parse(m[0]);
          transcript = String(j.t || "").trim();
          translated = String(j.x || "").trim();
          const l = String(j.l || "").trim().toLowerCase();
          detectedLang = LANG_NAMES[l] ? l : "";
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
${contextBlock}Transcribe the speech in this audio clip. The speaker is speaking ${langName} (may include code-switching) during a medical consultation. Output ONLY the transcript in the original language(s), nothing else. OMIT hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと") but keep all meaningful words and proper nouns exactly.
${NO_INVENTION}
If there is no clear human speech, or the speech is ONLY hesitation fillers, output exactly: [NO_SPEECH]`,
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
    // source_lang 은 감지 언어 우선 — 설정 언어로 기록하면 echo 건이 ru→ko 로 오염됨(7/10 로그)
    //
    // ⚠️ 출발어 == 도착어면 저장하지 않는다. 219행에서 "같은 언어면 번역=원문"으로 채우는데,
    //    그걸 그대로 저장하면 **원문을 번역문이라고 기록**하게 된다(2026-07-20 실측 ko→ko 13건).
    //    번역 기록 탭이 의미 없는 줄로 차고, 회의록 요약 입력도 같은 말이 두 번 들어간다.
    //    (자막 표시는 위에서 이미 끝났으므로 저장만 건너뛰면 화면 동작엔 영향 없다.)
    const effectiveSrc = detectedLang || lang;
    if (!isPartial && transcript && translated && targetLang && effectiveSrc !== targetLang) {
      saveTranslationLog(consultationId, {
        originalText: transcript,
        translatedText: translated,
        sourceLang: detectedLang || lang,
        targetLang,
        speakerName,
      }).catch((err: any) =>
        console.error("[consultation/stt] DB save error:", err?.message?.slice(0, 200))
      );
    }

    return Response.json({ ok: true, transcript, translated, detectedLang: detectedLang || lang });
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
    speakerName?: string | null;
  }
) {
  const { getSupabaseServerClient } = await import("@/lib/data/supabaseServerClient");
  const supabase = getSupabaseServerClient();

  // 대화 내용은 암호문으로만 저장한다(평문 컬럼 null) — 상담엔 진단·병기가 그대로 들어간다.
  await supabase.from("consultation_translations").insert([
    {
      session_id: consultationId,
      source_lang: data.sourceLang,
      target_lang: data.targetLang,
      // 이 라우트로 들어온 줄은 정의상 «서버 받아쓰기» 다 — 클라이언트 값을 믿지 않는다.
      stt_engine: STT_ENGINES.SERVER,
      // 화자 이름(환자 실명)도 암호문 칸에 — 예전엔 speaker_name 평문으로 줄마다 쌓였다(2026-08-14 감사).
      ...encryptTranscriptRow({
        sourceText: data.originalText,
        translatedText: data.translatedText,
        speakerName: data.speakerName ?? null,
      }),
    },
  ]);
}
