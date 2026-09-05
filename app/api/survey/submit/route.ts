/**
 * POST /api/survey/submit
 *
 * 만족도 설문 응답 저장
 * - token 검증 (만료/사용 여부)
 * - survey_responses insert
 * - surveys.responded = true 업데이트
 * - ip_hash: SHA-256 (개인정보 보호)
 * - rate limit: IP당 5분에 3회
 *
 * NOTE: surveys / survey_responses 는 마이그레이션으로 추가된 테이블.
 * DB 타입 파일이 갱신되기 전까지 `as any` 캐스팅 사용.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { hashIp } from "@/lib/surveys/generateSurveyToken";
import { checkRateLimitPersistent, getClientIp } from "@/lib/rateLimit";

const SURVEY_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000,
  maxRequests: 3,
  apiName: "survey_submit",
};

function isValidScore(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // rate limit
  const rl = await checkRateLimitPersistent(clientIp || "unknown", SURVEY_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { token, q1, q2, q3, q4, q5, comment } = body as Record<string, unknown>;

  if (!token || typeof token !== "string" || token.length > 64) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  // 점수 검증
  for (const [key, val] of [
    ["q1", q1],
    ["q2", q2],
    ["q3", q3],
    ["q4", q4],
    ["q5", q5],
  ] as [string, unknown][]) {
    if (!isValidScore(val)) {
      return Response.json(
        { ok: false, error: `invalid_score_${key}` },
        { status: 400 }
      );
    }
  }

  const db = supabaseAdmin as any;

  // 토큰 조회
  const { data: survey, error: surveyErr } = await db
    .from("surveys")
    .select("id, responded, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (surveyErr) {
    console.error("[api/survey/submit] db error:", surveyErr.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  if (!survey) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (survey.responded) {
    return Response.json({ ok: false, error: "already_responded" }, { status: 409 });
  }

  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return Response.json({ ok: false, error: "expired" }, { status: 410 });
  }

  const ipHash = clientIp ? hashIp(clientIp) : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  // 응답 저장
  const { error: insertErr } = await db
    .from("survey_responses")
    .insert({
      survey_id: survey.id,
      q1_score: q1 as number,
      q2_score: q2 as number,
      q3_score: q3 as number,
      q4_score: q4 as number,
      q5_score: q5 as number,
      comment: typeof comment === "string" ? comment.slice(0, 2000) : null,
      submitted_at: new Date().toISOString(),
      ip_hash: ipHash,
      user_agent: userAgent,
    });

  if (insertErr) {
    // 23505 = UNIQUE 위반. 위의 survey.responded 검사는 «읽고 나서 쓰는» 구조라
    // 동시에 두 번 제출하면 둘 다 통과한다(둘 다 responded=false 를 읽는다).
    // 그래서 DB 에 survey_responses_one_per_survey(survey_id UNIQUE)를 걸어 뒀고,
    // 경합에서 진 쪽이 여기로 온다 — 이건 «장애»가 아니라 «이미 응답함»이다.
    // (막지 않으면 같은 링크로 응답을 여러 번 밀어넣어 만족도 KPI 를 부풀릴 수 있다.)
    if ((insertErr as { code?: string }).code === "23505") {
      return Response.json({ ok: false, error: "already_responded" }, { status: 409 });
    }
    console.error("[api/survey/submit] insert error:", insertErr.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }

  // surveys.responded = true
  await db
    .from("surveys")
    .update({ responded: true })
    .eq("id", survey.id);

  return Response.json({ ok: true });
}
