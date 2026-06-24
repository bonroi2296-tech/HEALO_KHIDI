/**
 * GET /api/survey/[token]
 *
 * 토큰 검증 → 설문 메타데이터 반환 (응답 전 상태만)
 * 응답 후 접근 시 responded=true 반환 → 클라이언트에서 감사 페이지로
 *
 * NOTE: surveys 는 마이그레이션으로 추가된 테이블.
 * DB 타입 파일이 갱신되기 전까지 `as any` 캐스팅 사용.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp } from "@/lib/rateLimit";

// 토큰 열거(enumeration) 방어: IP당 1분에 30회 (정상 1회 조회엔 충분, 무차별 대입 차단)
const SURVEY_LOOKUP_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 30,
  apiName: "survey_lookup",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // rate limit (토큰 열거 방어)
  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp || "unknown", SURVEY_LOOKUP_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429 }
    );
  }

  const { token } = await params;

  if (!token || token.length > 64) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const db = supabaseAdmin as any;

  const { data: survey, error } = await db
    .from("surveys")
    .select("id, survey_type, responded, expires_at, patient_id, consultation_session_id")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("[api/survey/token] db error:", error.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  if (!survey) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // 만료 체크
  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return Response.json({ ok: false, error: "expired" }, { status: 410 });
  }

  return Response.json({
    ok: true,
    surveyId: survey.id,
    surveyType: survey.survey_type,
    responded: survey.responded,
    expiresAt: survey.expires_at,
  });
}
