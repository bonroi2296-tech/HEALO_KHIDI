/**
 * ⚠️ EXPERIMENTAL: Admin 전용 번역 비교 API
 * 
 * 경로: /api/admin/experimental/translate
 * 권한: 관리자 전용
 * Rate Limit: Admin (100회/분)
 * 
 * 목적:
 * - Admin이 번역 품질을 비교하기 위한 실험용 API
 * - 2개 번역 엔진의 결과를 비교
 * 
 * ⚠️ 중요 제약:
 * - ❌ 번역 결과를 DB/로그에 저장하지 않음
 * - ❌ RAG/normalized_inquiries 파이프라인에 사용 금지
 * - ✅ on-demand 요청에만 응답
 * - ✅ 참고용 실험 데이터로만 활용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { compareTranslations } from "../../../../../src/lib/experimental/translation";

/**
 * POST: 번역 비교 실행
 * 
 * Body:
 * {
 *   "text": "Hello world",
 *   "sourceLang": "en",
 *   "targetLang": "ko"
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   result: {
 *     original: "Hello world",
 *     translationA: "...",
 *     translationB: "...",
 *     sourceLang: "en",
 *     targetLang: "ko",
 *     timestamp: 1234567890
 *   },
 *   _warning: "EXPERIMENTAL: Do not use for production or store in DB"
 * }
 */
export async function POST(request: NextRequest) {
  // ========================================
  // 1. 관리자 권한 확인 + Rate Limit
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 or 429
  }

  const { authResult } = auth;

  // ========================================
  // 2. Request Body 파싱
  // ========================================
  try {
    const body = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return Response.json(
        {
          ok: false,
          error: "invalid_input",
          detail: "text (string) is required",
        },
        { status: 400 }
      );
    }

    const text = body.text.trim();
    const sourceLang = body.sourceLang || "en";
    const targetLang = body.targetLang || "ko";

    if (text.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "empty_text",
          detail: "Text to translate is empty",
        },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return Response.json(
        {
          ok: false,
          error: "text_too_long",
          detail: "Text must be less than 5000 characters",
        },
        { status: 400 }
      );
    }

    // ========================================
    // 3. 번역 비교 실행 (2개 모델)
    // ========================================
    console.log(
      `[admin/experimental/translate] ⚠️ Translation comparison: ${authResult.email} | length: ${text.length} | ${sourceLang}→${targetLang}`
    );

    const result = await compareTranslations(text, sourceLang, targetLang);

    // ========================================
    // 4. 응답 반환 (경고 포함)
    // ========================================
    return Response.json({
      ok: true,
      result,
      _warning: "EXPERIMENTAL: Do not use for production or store in DB",
      _note: "This is for quality comparison only",
    });
  } catch (error: any) {
    console.error("[admin/experimental/translate] Error:", error.message);
    return Response.json(
      {
        ok: false,
        error: "translation_failed",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
