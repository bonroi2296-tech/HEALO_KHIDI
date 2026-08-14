/**
 * healwith: Text 번역 API (브라우저 호출 허용 — 병원 리뷰 번역 등)
 *
 * 보안:
 * - Origin / Referer 체크 — 우리 도메인에서만 호출 가능
 * - Rate limit (IP당 분당 10회, 요청당 texts 최대 10개) — Gemini 과금 DoS 방지
 * - 응답 길이 제한 (입력 문자열당 최대 2000자)
 *
 * ⚠️ 과거 버전은 인증/rate-limit 없이 Gemini 2.5 Flash 무제한 호출 가능 →
 *    외부 도메인이 우리 Gemini 과금 계정으로 번역 호출 가능했음.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import { isAllowedOrigin } from "@/lib/security/allowedOrigin";
import { logAiUsage } from "@/lib/ai/usageLog";

const MODEL_ID = "gemini-flash-latest";

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", ru: "Russian", kz: "Kazakh",
};

const TRANSLATE_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  apiName: "translate_text",
};

const MAX_TEXTS = 10;
const MAX_TEXT_LENGTH = 2000;

// Origin 검사는 공용 헬퍼(@/lib/security/allowedOrigin)로 통일.
// 예전 자체 사본은 ①환경 구분 없이 localhost 를 허용하고 ②`.vercel.app` 접미사를 통째로
// 허용해 공용 함수보다 느슨했다(2026-08-14 보안감사). 공용 함수는 실서비스에서 우리 도메인만
// 통과시켜 남의 사이트발 브라우저 CSRF 를 확실히 막는다. (헤더를 위조하는 비브라우저 남용은
// 어떤 origin 검사로도 못 막으므로, 실질 천장은 아래 rate limit + checkAiGuards 다.)

export async function POST(request: NextRequest) {
  // ✅ Origin 화이트리스트 검사 (외부 도메인 차단)
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const originUrl = origin || (referer ? new URL(referer).origin : null);
  if (!isAllowedOrigin(originUrl)) {
    return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
  }

  // ✅ Rate limit (DB 기반 — 인스턴스 간 공유) + AI 비용 가드
  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, TRANSLATE_RATE);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }
  const aiGuard = await checkAiGuards(clientIp, "/api/translate-text");
  if (!aiGuard.allowed) {
    return NextResponse.json({ ok: false, error: aiGuard.code }, { status: aiGuard.status });
  }

  try {
    const { texts, targetLang } = await request.json();

    if (!Array.isArray(texts) || !targetLang || !LANG_NAMES[targetLang]) {
      return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
    }
    if (texts.length > MAX_TEXTS) {
      return NextResponse.json({ ok: false, error: "too_many" }, { status: 400 });
    }
    for (const t of texts) {
      if (typeof t !== "string" || t.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ ok: false, error: "text_too_long" }, { status: 400 });
      }
    }

    const { text: result, usage } = await generateText({
      model: google(MODEL_ID),
      // 출력 토큰 상한 — 입력은 캡(10×2000자)이지만 출력은 무제한이면 비용/지연 폭주 가능(다른 AI 라우트와 동일 가드)
      maxOutputTokens: 4096,
      prompt: `Translate these ${texts.length} texts to ${LANG_NAMES[targetLang]}. Return ONLY a JSON array of translated strings in the same order. No explanation.\n\n${JSON.stringify(texts)}`,
    });
    // 계측 — 이 경로가 logAiUsage 를 안 불러 어드민 AI 비용 화면에 「0」으로 보였다(2026-08-14 감사).
    void logAiUsage({ surface: "text_translate", model: MODEL_ID, usage, meta: { count: texts.length, lang: targetLang } });

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: "parse_failed" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, translations: JSON.parse(jsonMatch[0]) },
      { headers: getRateLimitHeaders(rl) }
    );
  } catch (err: any) {
    console.error("[translate-text]", err.message);
    return NextResponse.json({ ok: false, error: "translate_failed" }, { status: 500 });
  }
}
