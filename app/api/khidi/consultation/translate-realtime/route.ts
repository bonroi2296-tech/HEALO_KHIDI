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

import { encryptTranscriptRow } from "@/lib/consultation/transcriptCrypto";
import { NextRequest } from "next/server";
import { generateText } from "ai";
import { callGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";
import { google } from "@ai-sdk/google";
import { requireConsultationAccess, requireAuthenticatedUser } from "@/lib/auth/requireConsultationAccess";
import { verifyGuestTokenReadOnly } from "@/lib/auth/guestToken";
import { checkConsultationAiGuard } from "@/lib/ai/aiGuard";
import { detectLanguage } from "@/lib/translate";
import { looksLikeLeakedTranslation } from "@/lib/consultation/translateOutputGuard";
import { STT_ENGINES, normalizeSttEngine } from "@/lib/consultation/sttEngine";

// Origin 화이트리스트 (브라우저에서 진료 중 호출되므로 시크릿 대신 Origin 검증)
const ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
]);
function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader) return false;
  if (ALLOWED_ORIGINS.has(originHeader)) return true;
  try {
    const u = new URL(originHeader);
    if (u.hostname.endsWith(".vercel.app")) return true;
    if (u.hostname.endsWith(".healo.kr") || u.hostname === "khidi.healo.kr") return true;
    if (u.hostname.endsWith(".healwith.co.kr") || u.hostname === "healwith.co.kr") return true;
  } catch {}
  return false;
}

const MAX_TEXT_LENGTH = 2000;

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  ru: "Russian",
  en: "English",
  kz: "Kazakh",
  zh: "Chinese",
  ja: "Japanese",
};

// 대화 문맥(직전 발화) — 클라이언트 링버퍼에서 전달. 개수·길이 상한으로 프롬프트 오염 방지.
const MAX_CONTEXT_ITEMS = 6;
const MAX_CONTEXT_ITEM_CHARS = 300;

type ContextItem = { speaker: "self" | "other"; lang: string; text: string };

function sanitizeContext(raw: unknown): ContextItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_CONTEXT_ITEMS)
    .map((it: any): ContextItem => ({
      speaker: it?.speaker === "other" ? "other" : "self",
      lang: typeof it?.lang === "string" && LANG_NAMES[it.lang] ? it.lang : "",
      text: typeof it?.text === "string" ? it.text.slice(0, MAX_CONTEXT_ITEM_CHARS) : "",
    }))
    .filter((it) => it.text);
}

function buildContextBlock(context: ContextItem[]): string {
  if (!context.length) return "";
  const lines = context.map(
    (it) => `[${it.speaker}${it.lang ? `, ${it.lang}` : ""}] ${it.text}`
  );
  return `Recent conversation (oldest first) — for context ONLY, do NOT translate or repeat it:
${lines.join("\n")}

`;
}

function buildPrompt(sourceLang: string, targetLang: string): string {
  const src = LANG_NAMES[sourceLang] || sourceLang;
  const tgt = LANG_NAMES[targetLang] || targetLang;

  return `You are a real-time medical interpreter for a telemedicine consultation between a Korean hospital doctor and a foreign patient.
Domain: Korea–CIS medical tourism (oncology). Hospital names, drug/test names, and business terms (e.g. "меморандум"/MOU = 업무협약, agency commission) appear often — treat unfamiliar words as proper nouns, never guess unrelated meanings.

Translate the following ${src} text to ${tgt}.

RULES:
- Translate naturally and accurately, preserving medical terminology
- Use formal/polite register appropriate for doctor-patient communication
- For medical terms, use the standard term in the target language (e.g. "трепан-биопсия" → "트레핀 생검", "второе мнение" → "세컨드 오피니언(2차 소견)")
- When translating into Korean, never address or refer to people as "당신"/"그녀"/"그" — use role terms (환자분, 선생님, 원장님, 대표님) or omit the subject as natural Korean does
- If conversation context is provided, use it to resolve pronouns, omitted subjects, and ambiguous short replies; keep terminology, names, numbers, and the direction of payments/actions consistent with earlier lines
- Keep the translation concise — this is for real-time subtitles
- Omit hesitation fillers (e.g. "음", "어", "그…", "uh", "um", "э-э", "ну", "えっと") from the translation; if the text is ONLY fillers with no content, output nothing at all
- If the input text is already entirely in ${tgt} (mislabeled source), output it unchanged — never "translate" it into broken text
- The input may be a mid-speech fragment cut off by voice detection; translate the fragment faithfully AS-IS — never invent a completion (this is a medical setting; invented content is dangerous)
- Output ONLY the translated text, nothing else — no quotes, no explanations`;
}

export async function POST(request: NextRequest) {
  try {
    // Origin 검증 (CSRF 방지)
    if (!isAllowedOrigin(request.headers.get("origin"))) {
      return Response.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
    }

    // partial=true: 말하는 중(interim) 부분 번역 — 화면 표시 전용이라 DB 기록을 남기지 않는다
    // (같은 발화가 확정 번역과 이중 기록되는 것 방지. 인증·비용가드는 동일 적용.)
    const { text, sourceLang, targetLang, consultationId, speakerRole, context, partial, sttEngine } =
      await request.json();

    if (!text || !sourceLang || !targetLang) {
      return Response.json(
        { ok: false, error: "text, sourceLang, targetLang are required" },
        { status: 400 }
      );
    }

    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { ok: false, error: `text too long (max ${MAX_TEXT_LENGTH})` },
        { status: 400 }
      );
    }

    // 인증: 게스트(초대링크 입장)는 계정이 없으므로 X-Guest-Token 으로 검증.
    // 계정 사용자는 기존 참가자 권한 검증.
    const guestToken = request.headers.get("x-guest-token");
    if (consultationId && guestToken) {
      const v = await verifyGuestTokenReadOnly(guestToken, String(consultationId));
      if (!v.valid) {
        return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } else if (consultationId) {
      const access = await requireConsultationAccess(request, String(consultationId));
      if (!access.success) return access.response;
    } else {
      const auth = await requireAuthenticatedUser(request);
      if (!auth.success) return auth.response;
    }

    // Skip if same language
    if (sourceLang === targetLang) {
      return Response.json({ ok: true, translated: text });
    }

    // 결정론적 echo 가드 — 입력이 이미 타겟 언어면(문자셋 판정) 모델 호출 없이 그대로 반환.
    // 프롬프트 지시("output it unchanged")에만 의존하면 비결정적 + 매 echo 마다 비용·지연 발생.
    // 7/10 로그: 한국어 발화가 ru→ko 설정으로 들어와 echo 된 건 10건 — 이 경로가 그 재발 방지.
    // 로그도 감지 언어로 기록해 source_lang 오염(ru→ko로 남던 것)을 막는다.
    const detectedSrc = detectLanguage(text);
    if (detectedSrc === targetLang) {
      // ⚠️ 저장하지 않는다. 여기는 "이미 타겟 언어라 번역이 필요 없다"는 경로인데,
      //    예전엔 원문을 translatedText 로 넣어 저장했다 → **원문을 번역문이라고 기록**.
      //    2026-07-20 실회의 로그에서 ru→ru 53건이 전부 이 경로였다(전체 무의미 기록의 80%).
      //    번역 기록 탭이 같은 말로 도배되고, AI 회의록 입력에도 중복으로 들어간다.
      //    자막 표시는 아래 응답으로 이미 되므로 저장만 건너뛰면 화면 동작은 그대로다.
      //    (같은 부류를 stt 라우트에서도 막았다 — ko→ko 13건.)
      return Response.json({ ok: true, translated: text, sourceLang: detectedSrc, targetLang });
    }

    // 비용 가드 (상담 안 끊는 높은 천장 — 유료키 전환 시 봇·루프발 청구 폭주 backstop)
    const guard = await checkConsultationAiGuard(
      consultationId ? String(consultationId) : null,
      "/api/khidi/consultation/translate-realtime"
    );
    if (!guard.allowed) {
      return Response.json({ ok: false, error: guard.code }, { status: guard.status });
    }

    // 문맥은 매 발화마다 바뀌므로 system(정적 규칙)이 아니라 user prompt 앞에 붙인다.
    const contextBlock = buildContextBlock(sanitizeContext(context));

    // 모델은 env 로 교체 실험 가능(TRANSLATE_MODEL=gemini-pro-latest 등) — 기본은 Flash 유지(비용).
    const genArgs = {
      model: google(process.env.TRANSLATE_MODEL || "gemini-flash-latest") as any,
      system: buildPrompt(sourceLang, targetLang),
      prompt: `${contextBlock}Text to translate:
${text}`,
      temperature: 0.1,
      maxOutputTokens: 500,
    };
    // 별칭 세대 교체 생존 사다리 — temperature 폐기(2026-07-21 공지)·thinking 거절 흡수.
    // 실시간 통역 자막이라 400 하나에 회의 전체가 벙어리가 된다.
    const gen = (a: any) => callGeminiWithCompat((p) => generateText(p as any), a);
    const { text: translated } = await gen(genArgs);

    let translatedText = translated.trim();

    // 출력이 번역문이 아니라 규칙 누출/후보 나열이면(위 가드) 1회 재시도, 그래도 이상하면
    // 이 조각은 버린다(빈 출력 취급 = 아래 저장·자막이 스킵됨). 추임새-빈출력 경로와 동일.
    // ponytail: 재시도 1회면 대개 복구된다. 여전히 누출이면 자막을 빼는 게 쓰레기를 띄우는 것보다 안전.
    if (looksLikeLeakedTranslation(translatedText, targetLang)) {
      const retry = await gen(genArgs).catch(() => null);
      const retried = (retry?.text || "").trim();
      translatedText =
        retried && !looksLikeLeakedTranslation(retried, targetLang) ? retried : "";
    }

    // Save to DB if consultationId provided (fire-and-forget)
    // 추임새 정리로 번역이 비면 기록도 남기지 않음. partial(중간 자막)도 기록 안 함.
    if (consultationId && translatedText && partial !== true) {
      saveTranslationLog(consultationId, {
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        speakerRole: speakerRole || "unknown",
        // 「어느 받아쓰기가 이 글을 만들었나」 — 클라이언트가 알려주지만 아는 값만 통과시킨다.
        // 이 라우트는 브라우저 받아쓰기가 기본이고, 서버 받아쓰기 폴백도 여기로 올 수 있다.
        sttEngine: normalizeSttEngine(sttEngine) ?? STT_ENGINES.BROWSER,
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
    sttEngine: string;
  }
) {
  const { getSupabaseServerClient } = await import(
    "@/lib/data/supabaseServerClient"
  );
  const supabase = getSupabaseServerClient();

  // 대화 내용은 암호문으로만 저장한다(평문 컬럼 null) — 상담엔 진단·병기가 그대로 들어간다.
  await supabase.from("consultation_translations").insert([
    {
      session_id: consultationId,
      source_lang: data.sourceLang,
      target_lang: data.targetLang,
      stt_engine: data.sttEngine,
      ...encryptTranscriptRow({
        sourceText: data.originalText,
        translatedText: data.translatedText,
      }),
    },
  ]);
}
