/**
 * GET /api/admin/khidi/satisfaction
 *
 * KHIDI KPI K-03 만족도 대시보드 API
 * - 응답률 (responded / total)
 * - Q1~Q5 평균 점수 및 100점 환산
 * - 전체 평균 100점 환산
 * - 자유 의견 최근 50건
 *
 * NOTE: surveys / survey_responses 는 마이그레이션으로 추가된 테이블.
 * DB 타입 파일이 갱신되기 전까지 `as any` 캐스팅 사용.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { KHIDI_TARGETS } from "@/lib/khidi/targets";
import { likertTo100, avgSatisfaction100 } from "@/lib/khidi/satisfaction";
import { fetchTestSurveyIds, idsToInFilter } from "@/lib/khidi/testData";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  assertSupabaseEnv();

  const db = supabaseAdmin as any;

  // 테스트/실제 분리: ?includeTest=1 이면 테스트 설문도 포함(평소엔 실적만).
  const includeTest = new URL(request.url).searchParams.get("includeTest") === "1";
  const testSurveyFilter = includeTest ? null : idsToInFilter(await fetchTestSurveyIds(db));

  // 전체 설문 수 + 응답 수
  let totalQ = db.from("surveys").select("id", { count: "exact", head: true });
  if (testSurveyFilter) totalQ = totalQ.not("id", "in", testSurveyFilter);
  const { count: totalCount } = await totalQ;

  let respondedQ = db
    .from("surveys")
    .select("id", { count: "exact", head: true })
    .eq("responded", true);
  if (testSurveyFilter) respondedQ = respondedQ.not("id", "in", testSurveyFilter);
  const { count: respondedCount } = await respondedQ;

  // Q1~Q5 평균 집계 — fallback: 직접 쿼리
  let q1Avg = 0, q2Avg = 0, q3Avg = 0, q4Avg = 0, q5Avg = 0, totalResponses = 0;

  let responsesQ = db
    .from("survey_responses")
    .select("q1_score, q2_score, q3_score, q4_score, q5_score");
  if (testSurveyFilter) responsesQ = responsesQ.not("survey_id", "in", testSurveyFilter);
  const { data: responses } = await responsesQ;

  if (responses && Array.isArray(responses) && responses.length > 0) {
    totalResponses = responses.length;
    q1Avg = responses.reduce((s: number, r: any) => s + (r.q1_score || 0), 0) / totalResponses;
    q2Avg = responses.reduce((s: number, r: any) => s + (r.q2_score || 0), 0) / totalResponses;
    q3Avg = responses.reduce((s: number, r: any) => s + (r.q3_score || 0), 0) / totalResponses;
    q4Avg = responses.reduce((s: number, r: any) => s + (r.q4_score || 0), 0) / totalResponses;
    q5Avg = responses.reduce((s: number, r: any) => s + (r.q5_score || 0), 0) / totalResponses;
  }

  // Likert(1~5) → 100점 환산 (kpi.ts 와 단일 소스: satisfaction.ts).
  // 응답 없으면 기존 동작대로 0.
  const to100 = likertTo100;
  const overallAvg100 = avgSatisfaction100(responses) ?? 0;

  // 자유 의견 최근 50건
  let commentsQ = db
    .from("survey_responses")
    .select("comment, submitted_at, survey_id")
    .not("comment", "is", null)
    .neq("comment", "")
    .order("submitted_at", { ascending: false })
    .limit(50);
  if (testSurveyFilter) commentsQ = commentsQ.not("survey_id", "in", testSurveyFilter);
  const { data: comments } = await commentsQ;

  const responseRate =
    totalCount && totalCount > 0
      ? Math.round(((respondedCount || 0) / totalCount) * 100 * 10) / 10
      : 0;

  return Response.json({
    ok: true,
    totalSurveys: totalCount || 0,
    respondedSurveys: respondedCount || 0,
    totalResponses,
    responseRate,
    scores: {
      q1: { avg5: Math.round(q1Avg * 100) / 100, avg100: to100(q1Avg) },
      q2: { avg5: Math.round(q2Avg * 100) / 100, avg100: to100(q2Avg) },
      q3: { avg5: Math.round(q3Avg * 100) / 100, avg100: to100(q3Avg) },
      q4: { avg5: Math.round(q4Avg * 100) / 100, avg100: to100(q4Avg) },
      q5: { avg5: Math.round(q5Avg * 100) / 100, avg100: to100(q5Avg) },
    },
    overallAvg100,
    kpiK03Target: KHIDI_TARGETS.satisfaction,
    kpiK03Met: overallAvg100 >= KHIDI_TARGETS.satisfaction,
    recentComments: ((comments as any[]) || []).map((c: any) => ({
      comment: c.comment,
      submittedAt: c.submitted_at,
      surveyId: c.survey_id,
    })),
  });
}
