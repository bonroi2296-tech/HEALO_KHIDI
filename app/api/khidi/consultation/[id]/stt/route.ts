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
import { logAiUsage } from "@/lib/ai/usageLog";
import { STT_ENGINES } from "@/lib/consultation/sttEngine";
import { transcriptsAgree } from "@/lib/consultation/transcriptAgreement";
import {
  bcp47For,
  transcribeExperimentModel,
  transcribeViaInteractions,
} from "@/lib/consultation/transcribeInteractions";

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

/**
 * 한 호출이 이 출력 토큰을 넘으면 로그에 남긴다(막지는 않는다) — 「너무 많이 쓰면 알려줘」(PO).
 * **0 을 주면 경고를 끈다** — `Number(env || 4000)` 형태면 "0" 이 truthy 라 0 으로 읽혀
 * 오히려 모든 호출이 경고를 찍는다.
 */
const STT_OUTPUT_WARN_TOKENS = Number(process.env.STT_OUTPUT_WARN_TOKENS ?? 4000);

/**
 * 말하는 중 흐른 «중간 자막»을 DB 에 남길지(2026-09-01 PO 지시, 당분간).
 * 임시 조치이므로 코드가 아니라 설정으로 끈다 — env 를 "0" 으로 두면 확정 자막만 남는다.
 */
const SAVE_PARTIAL_SUBTITLES = process.env.SAVE_PARTIAL_SUBTITLES !== "0";

/** 호출 1건의 사용량을 남긴다. 상한을 안 거는 대신 «얼마나 쓰는지»는 반드시 잰다. */
function recordSttUsage(modelId: string, res: any, meta: Record<string, unknown>) {
  void logAiUsage({
    surface: "consult_stt",
    model: modelId,
    usage: res?.usage,
    providerMetadata: res?.providerMetadata,
    response: res?.response,
    meta: { ...meta, finish_reason: res?.finishReason ?? null },
  });
  const out = Number(res?.usage?.outputTokens ?? 0);
  if (STT_OUTPUT_WARN_TOKENS > 0 && out > STT_OUTPUT_WARN_TOKENS) {
    console.warn(`[consultation/stt] 출력 토큰 과다: ${out} (${modelId}, ${JSON.stringify(meta)})`);
  }
}

async function genWithFallback(
  modelId: string,
  // ⚠️ maxOutputTokens 를 «안 넘긴다»(2026-09-01 PO 지시, 당분간).
  //   이 예산에는 모델의 «생각» 토큰이 같이 들어간다. 생각을 많이 쓰는 호출에서는 예전
  //   값(300/400/800)이 다 먹혀 JSON 이 잘리고 → 파싱 실패 → 조각 통째로 폐기가 된다
  //   (= 자막이 잘리는 게 아니라 아예 안 뜬다).
  //   ⚠️ 다만 «항상» 그런 것은 아니다 — 2026-09-01 실측(컴퓨터 음성 wav 로 재현):
  //   짧고 또렷한 조각은 생각을 50~95 밖에 안 써서 상한 300 에서도 stop 으로 끝났다.
  //   즉 이 상한은 «생각이 길어지는 호출»에서만 터진다. 앞선 주석이 이를 단정형으로
  //   적었던 것을 실측에 맞춰 고친다.
  //   ○ 상한을 없앤 쪽이 지연도 낫다 — 같은 오디오로 짝지어 4회 비교, 4/4 로 더 빨랐다
  //     (짧은 조각 7.1초→3.9초·13.5초→4.4초, 긴 조각 8.7초→4.7초·25.1초→19.1초).
  //     뱉는 토큰 양은 거의 같았다(68~101 vs 97~114) — 천장은 지연을 만들지 않는다.
  //   대신 위 recordSttUsage 로 실제 사용량을 재고, 비용 backstop 은 aiGuard 일일 호출
  //   상한과 Google 콘솔 spend cap 이 맡는다.
  args: { messages: any; temperature: number; maxOutputTokens?: number },
  usageMeta: Record<string, unknown> = {}
): Promise<string> {
  try {
    // 별칭 세대 교체 생존 사다리 — temperature 폐기(2026-07-21 공지)·thinking 거절을 흡수.
    // 자막은 실시간이라 400 한 번에 통째로 끊기면 회의가 못 돌아간다.
    const res = await callGeminiWithCompat((p) => generateText(p as any), {
      model: google(modelId) as any,
      ...args,
    });
    recordSttUsage(modelId, res, usageMeta);
    return (res as any).text || "";
  } catch (e) {
    // Pro 등 비-Flash 모델이 실패하면(별칭 오류·쿼터 등) Flash 로 1회 폴백 — kz 자막이 끊기지 않게.
    if (modelId !== "gemini-flash-latest") {
      const res = await callGeminiWithCompat((p) => generateText(p as any), {
        model: google("gemini-flash-latest") as any,
        ...args,
      });
      recordSttUsage("gemini-flash-latest", res, { ...usageMeta, fallback_from: modelId });
      return (res as any).text || "";
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
    // partial=1 → 말하는 중 조각. 확정 자막과 «칸을 갈라»(is_partial) 저장하고,
    // 회의록·번역 기록 조회는 확정본만 본다(2026-09-01 부터 품질 측정용으로 남긴다).
    const isPartial = String(formData.get("partial") || "") === "1";
    // 「이 오디오가 누구 목소리인가」 — 이 라우트로 오는 소리가 항상 내 마이크는 아니다.
    // 청취 모드(ListenModeBridge)는 «상대 참가자의 마이크 트랙»을 녹음해 같은 라우트로 보낸다.
    // self 로 못박으면 상대 발화가 「내 말」로 저장돼, 이름이 없는 줄에서 화면이 상대를
    // 「나」로 표시하고 두 사람의 말이 한 덩이로 묶인다. 아는 값만 통과시키고, 안 알려주면
    // null 로 둔다 — 모르는 것을 self 라고 단정하지 않는다.
    const speakerRoleRaw = String(formData.get("speakerRole") || "").trim();
    const speakerRole =
      speakerRoleRaw === "self" || speakerRoleRaw === "other" ? speakerRoleRaw : null;

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

    // ── 실험 경로(2026-09-05, PO 「지금 실험 착수」): 받아쓰기 «전용» 모델 Gemini 3.5 Transcribe ──
    // env STT_TRANSCRIBE_MODEL 이 비어 있으면(기본) 이 블록은 통째로 건너뛴다 = 실서비스 동작 0 변화.
    // 켜면: 받아쓰기는 Interactions API(별도 엔드포인트, 생각 토큰 없음·kk-KZ 명시) → 번역만 기존 Flash.
    // 호출 실패·응답 모양 불일치면 아래 기존 Flash 경로로 «그대로» 떨어진다 — 실험이 자막을 죽이면 안 된다.
    // 대조 검사(2회 호출 합의)는 이 경로엔 안 건다: 전용 모델의 지어냄 성향은 미측정이라 «첫 실회의에서 잰다».
    // 켜는 법·재는 법·한계: docs/KNOWN_ISSUES.md 「2026-09-05 트렌드 스캔 발견」 ②.
    let experimentHandled = false;
    const transcribeModel = transcribeExperimentModel();
    if (transcribeModel) {
      try {
        const r = await transcribeViaInteractions({
          model: transcribeModel,
          audio: buf,
          mimeType: mediaType,
          // 후보 언어 힌트 = 설정 언어 + 도착 언어(같은 마이크를 두 언어가 쓸 수 있다). 모르는 코드는 빠진다.
          languageCodes: [bcp47For(lang), targetLang ? bcp47For(targetLang) : ""],
        });
        void logAiUsage({
          surface: "consult_stt",
          model: transcribeModel,
          promptTokens: r.usage?.promptTokens ?? null,
          completionTokens: r.usage?.completionTokens ?? null,
          meta: {
            kind: "transcribe_interactions",
            engine: "transcribe",
            partial: isPartial,
            lang,
            target: targetLang || null,
            audio_bytes: buf.byteLength,
            elapsed_ms: r.elapsedMs,
            status: r.status,
            text_found: r.found,
          },
        });
        if (!r.found) {
          // 문서 예시와 다른 응답 모양 — 조용히 빈 자막을 내지 말고 기존 경로로. 첫 실호출에서 모양을 잡는 용도.
          console.warn(
            `[consultation/stt] transcribe 응답에 text 조각 없음 (status=${r.status}, keys=${r.topKeys.join(",")}) → Flash 경로로 폴백`
          );
        } else {
          transcript = r.text;
          if (transcript && targetLang && targetLang !== lang) {
            // 번역만 Flash — 받아쓴 «글»을 넘기므로 오디오 경로보다 싸고, 생각 토큰이 잘라먹을 오디오 해석이 없다.
            const targetName = LANG_NAMES[targetLang];
            const out = await genWithFallback(
              "gemini-flash-latest",
              {
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `${contextBlock}The following is a verbatim transcript from a medical teleconsultation (Korea–CIS oncology care). The speaker most likely speaks ${langName}, but DETECT the language actually used (candidates: Korean ko, Russian ru, English en, Kazakh kz, Chinese zh, Japanese ja; prefer ${langName}/${targetName} when ambiguous).
If the detected language is already ${targetName}, set "x" to the transcript itself (do NOT translate). Otherwise translate it into ${targetName} — formal/polite register, standard medical terminology, concise (for real-time subtitles). Do NOT add, omit, or complete anything.
Transcript:
${transcript}
Respond with ONLY this JSON on one line, no markdown, no code fences:
{"x":"<translation>","l":"<detected language code>"}`,
                      },
                    ],
                  },
                ],
                temperature: 0,
              },
              { partial: isPartial, kind: "translate_after_transcribe", lang, target: targetLang }
            );
            const cleaned = (out || "").replace(/```(?:json)?/g, "").trim();
            const m = cleaned.match(/\{[\s\S]*\}/);
            if (m) {
              try {
                const j = JSON.parse(m[0]);
                const l = String(j.l || "").trim().toLowerCase();
                translated = String(j.x || "").trim();
                detectedLang = LANG_NAMES[l] ? l : "";
              } catch {
                translated = "";
              }
            }
            // 번역 파싱이 실패해도 원문은 내보낸다 — 실험 경로에서 «덜 보이는 것»이 «안 보이는 것»보다 낫다.
          } else if (targetLang === lang) {
            translated = transcript;
          }
          experimentHandled = true;
        }
      } catch (e: any) {
        console.warn(
          `[consultation/stt] transcribe 실험 경로 실패 → Flash 경로로 폴백: ${String(e?.message || e).slice(0, 160)}`
        );
      }
    }

    // ── 지어냄 거르개: 확정 자막은 «두 번 물어 답이 닮았을 때만» 채택한다 ──
    //
    // 왜: 모델은 말이 없는 조각을 받으면 침묵하지 않고 그럴듯한 진료 문장을 만든다
    //   (2026-08-07 실측: 무음·잡음 조각에서 15/15 = 100% 창작. PO 가 빈 방에서 본 그것).
    //   프롬프트로 금지하는 방식은 8/03·8/04 두 번 시도해 안 줄었다(#1253·#1297).
    //   그런데 **창작은 부를 때마다 다른 문장이고 진짜 말은 매번 같은 문장**이다 —
    //   실측 닮음이 창작 0.01~0.02 대 진짜 0.87~1.00 로 겹치지 않는다.
    //   판정 근거·문턱·재현법은 src/lib/consultation/transcriptAgreement.ts 참고.
    //
    // 부분 조각(말하는 중)은 1회만 부른다 — 어차피 곧 확정본이 덮고, 화면에만 잠깐 뜨며
    //   기록에는 안 남는다. 여기까지 두 배로 부르면 비용·지연만 늘고 얻는 게 적다.
    //   ⚠️ 그래서 «말하는 중» 자막엔 지어낸 문장이 잠깐 스칠 수 있다.
    // ⚠️ 한 쪽이 실패해도 자막을 통째로 죽이지 않는다.
    //   Promise.all 로 두면 «둘 중 하나만 삐끗해도 요청 전체가 실패»한다 = 호출을 두 배로
    //   늘린 만큼 자막이 끊길 확률도 두 배가 된다. 지어냄을 막으려다 자막을 끊으면 손해다.
    //   한 쪽만 살아 오면 그 답을 쓴다 — 그건 오늘까지의 동작(1회 호출)과 같아서 나빠지진 않는다.
    //   대신 그 조각엔 대조가 안 걸렸다는 뜻이므로 기록에 남긴다.
    const askModel = async (
      modelId: string,
      genArgs: { messages: any; temperature: number; maxOutputTokens?: number },
      usageMeta: Record<string, unknown> = {}
    ): Promise<string[]> => {
      if (isPartial) return [await genWithFallback(modelId, genArgs, usageMeta)];
      const settled = await Promise.allSettled([
        genWithFallback(modelId, genArgs, usageMeta),
        genWithFallback(modelId, genArgs, { ...usageMeta, run: 2 }),
      ]);
      const ok = settled
        .filter((s): s is PromiseFulfilledResult<string> => s.status === "fulfilled")
        .map((s) => s.value);
      if (ok.length === 0) throw (settled[0] as PromiseRejectedResult).reason;
      if (ok.length === 1) {
        console.info("[consultation/stt] 두 번 중 한 번만 응답 — 대조 없이 통과시킴");
      }
      return ok;
    };

    /** 두 번째 답과 닮지 않으면 «지어냄»으로 보고 버린다. 1회 호출(부분)이면 그대로 통과. */
    const agreedOrEmpty = (runs: { transcript: string }[]): boolean => {
      if (runs.length < 2) return true;
      if (transcriptsAgree(runs[0].transcript, runs[1].transcript)) return true;
      console.info(
        `[consultation/stt] 합의 실패로 버림: "${runs[0].transcript.slice(0, 40)}" vs "${runs[1].transcript.slice(0, 40)}"`
      );
      return false;
    };

    // 실험 경로가 처리했으면 기존 Flash 경로는 건너뛴다(들여쓰기는 diff 를 작게 두려고 안 바꿨다).
    if (!experimentHandled) {
    if (targetLang && targetLang !== lang) {
      // ── 전사+번역 단일 호출 — 왕복 1회로 자막 지연 절반 ──
      // 언어 자동 감지: 화자가 설정 언어(lang)와 다른 언어를 말해도(같은 방 마이크에
      // 한국어·카자흐어 혼용, 언어 설정 실수 등) 실제 감지 언어 → targetLang 으로 번역.
      // 감지 언어가 이미 targetLang 이면 번역하지 않고 전사를 그대로 자막으로 (echo 방지 —
      // 7/10 로그 전수조사에서 한국어 발화가 ru→ko 로 들어가 원문 그대로 echo 된 건 10건).
      const targetName = LANG_NAMES[targetLang];
      const texts = await askModel(sttModelFor(lang, targetLang, isPartial), {
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
      }, { partial: isPartial, kind: "transcribe_translate", lang, target: targetLang });

      // 모델이 코드펜스로 감싸는 경우 대비해 벗긴 뒤 JSON 추출
      const runs = texts.map((text) => {
        const cleaned = (text || "").replace(/```(?:json)?/g, "").trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (!m) return { transcript: "", translated: "", detectedLang: "" }; // 파싱 실패 — 조각 폐기
        try {
          const j = JSON.parse(m[0]);
          const l = String(j.l || "").trim().toLowerCase();
          return {
            transcript: String(j.t || "").trim(),
            translated: String(j.x || "").trim(),
            detectedLang: LANG_NAMES[l] ? l : "",
          };
        } catch {
          // 파싱 실패 — 조각 폐기 (깨진 텍스트를 자막으로 내보내는 것보다 안전)
          return { transcript: "", translated: "", detectedLang: "" };
        }
      });
      if (agreedOrEmpty(runs)) {
        transcript = runs[0].transcript;
        translated = runs[0].translated;
        detectedLang = runs[0].detectedLang;
      }
    } else {
      // ── 전사만 (targetLang 없음 또는 같은 언어) ──
      const texts = await askModel(sttModelFor(lang), {
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
      }, { partial: isPartial, kind: "transcribe_only", lang });
      const runs = texts.map((text) => {
        const raw = (text || "").trim();
        return { transcript: raw === "[NO_SPEECH]" ? "" : raw };
      });
      if (agreedOrEmpty(runs)) transcript = runs[0].transcript;
      // 같은 언어면 자막 파이프라인이 그대로 표시할 수 있게 번역=원문
      if (targetLang === lang) translated = transcript;
    }
    } // !experimentHandled

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
    //
    // 중간 조각(isPartial)도 남긴다 — 하단 자막에 실제로 뭐가 떴는지 되짚을 방법이 없어
    // 품질을 잴 수가 없었다(2026-09-01 PO 지시, 당분간). is_partial 로 칸을 갈라 저장하므로
    // 회의록·통계(is_partial=false 만 본다)는 오염되지 않는다.
    const effectiveSrc = detectedLang || lang;
    if (
      transcript &&
      translated &&
      targetLang &&
      effectiveSrc !== targetLang &&
      (SAVE_PARTIAL_SUBTITLES || !isPartial)
    ) {
      saveTranslationLog(consultationId, {
        originalText: transcript,
        translatedText: translated,
        sourceLang: detectedLang || lang,
        targetLang,
        speakerName,
        isPartial,
        speakerRole,
      }).catch((err: any) =>
        console.error("[consultation/stt] DB save error:", err?.message?.slice(0, 200))
      );
    }

    return Response.json({
      ok: true,
      transcript,
      translated,
      detectedLang: detectedLang || lang,
      // 실험 측정용 — 어느 경로가 답했나(클라이언트는 몰라도 된다).
      engine: experimentHandled ? "transcribe" : "flash",
    });
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
    isPartial?: boolean;
    speakerRole?: "self" | "other" | null;
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
      // 「누가 말했나(역할)」 — 클라이언트가 알려준 값만 쓴다. 이 라우트엔 내 마이크(self)와
      // 청취 모드가 녹음한 상대 마이크(other)가 «둘 다» 들어온다.
      // (화면의 「나/상대」 판정은 이 값보다 화자 «이름»을 먼저 본다 — 같은 줄을 두 사람이
      //  보는데 role 은 DB 에 하나만 남기 때문이다. 이 값은 이름이 없을 때의 폴백이다.)
      speaker_role: data.speakerRole ?? null,
      // 「말하는 중 흐른 중간 자막인가」 — 확정 자막만 세는 곳은 false 만 본다.
      is_partial: data.isPartial === true,
      // 화자 이름(환자 실명)도 암호문 칸에 — 예전엔 speaker_name 평문으로 줄마다 쌓였다(2026-08-14 감사).
      ...encryptTranscriptRow({
        sourceText: data.originalText,
        translatedText: data.translatedText,
        speakerName: data.speakerName ?? null,
      }),
    },
  ]);
}
