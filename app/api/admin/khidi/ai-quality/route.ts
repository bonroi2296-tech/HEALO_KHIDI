/**
 * HEALO: AI 품질 대시보드 API
 *
 * GET /api/admin/khidi/ai-quality
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD&score_max=0.6&limit=50&offset=0
 *
 * 반환:
 * - daily_avg: 일별 평균 점수 (overall/hallucination/safety/relevance)
 * - low_score_items: overall_score < score_max 응답 목록
 * - summary: 기간 내 전체 통계
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "../../../../../src/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const from = (searchParams.get("from") ?? defaultFrom) + "T00:00:00Z";
  const to = (searchParams.get("to") ?? defaultTo) + "T23:59:59Z";
  const scoreMax = parseFloat(searchParams.get("score_max") ?? "0.6");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    // 1. 일별 평균 점수
    const { data: rawDaily, error: dailyErr } = await (supabaseAdmin as any)
      .from("ai_response_evaluations")
      .select("created_at, overall_score, hallucination_score, safety_score, relevance_score")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true });

    if (dailyErr) throw new Error(dailyErr.message);

    // 날짜별 집계
    const dayMap: Record<
      string,
      { overall: number[]; hallucination: number[]; safety: number[]; relevance: number[] }
    > = {};

    for (const row of rawDaily ?? []) {
      const day = (row.created_at as string).slice(0, 10);
      if (!dayMap[day]) {
        dayMap[day] = { overall: [], hallucination: [], safety: [], relevance: [] };
      }
      dayMap[day].overall.push(row.overall_score ?? 0);
      dayMap[day].hallucination.push(row.hallucination_score ?? 0);
      dayMap[day].safety.push(row.safety_score ?? 0);
      dayMap[day].relevance.push(row.relevance_score ?? 0);
    }

    const avg = (arr: number[]) =>
      arr.length === 0
        ? null
        : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

    const daily_avg = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        overall_avg: avg(v.overall),
        hallucination_avg: avg(v.hallucination),
        safety_avg: avg(v.safety),
        relevance_avg: avg(v.relevance),
        count: v.overall.length,
      }));

    // 2. 낮은 점수 응답 목록
    const { data: lowItems, error: lowErr } = await (supabaseAdmin as any)
      .from("ai_response_evaluations")
      .select(
        "id, thread_id, message_id, query_text, response_text, overall_score, hallucination_score, safety_score, relevance_score, flags, judge_reasoning, created_at"
      )
      .gte("created_at", from)
      .lte("created_at", to)
      .lt("overall_score", scoreMax)
      .order("overall_score", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (lowErr) throw new Error(lowErr.message);

    // 3. 전체 통계 요약
    const allScores = rawDaily?.map((r: any) => r.overall_score ?? 0) ?? [];
    const lowCount = (rawDaily ?? []).filter((r: any) => (r.overall_score ?? 1) < scoreMax).length;

    const summary = {
      total_count: allScores.length,
      avg_overall: avg(allScores),
      low_score_count: lowCount,
      low_score_rate:
        allScores.length > 0
          ? Math.round((lowCount / allScores.length) * 10000) / 100
          : 0,
    };

    return Response.json({
      ok: true,
      from,
      to,
      score_max: scoreMax,
      summary,
      daily_avg,
      low_score_items: lowItems ?? [],
    });
  } catch (err: any) {
    console.error("[ai-quality API] 오류:", err.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
