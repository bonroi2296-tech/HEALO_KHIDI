/**
 * healwith: AI 회귀테스트 결과 조회 — 어드민 전용
 *
 * GET /api/admin/khidi/ai-regression?days=30
 *
 * 왜(2026-07-02 전수 감사): /admin/khidi/ai-regression 페이지가 anon 브라우저 클라이언트로
 * ai_regression_runs(RLS on·정책 0 = deny-all)를 직접 조회해, cron 이 매일 적재하는
 * 88행+ 데이터가 화면에 영원히 '데이터 없음'으로 떴음 → 서버 API 경유로 소생.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const days = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await (supabaseAdmin as any)
      .from("ai_regression_runs")
      .select(
        "run_date, overall_score, passed, flags, latency_ms, first_token_ms, rag_chunk_count, test_id, id, ai_regression_tests(scenario_id, scenario_category)"
      )
      .gte("run_date", since)
      // ⚠️ 내림차순 + 명시 limit — 오름차순이면 PostgREST 기본 상한(1,000행)에 «최신»이 잘린다.
      //    2026-08-21 실측: 30일 창에 1,344행이라 화면이 10일 전(8/11) 실행을 「최근 실행」으로
      //    보여주고 있었다(그날 것도 50건 중 6건만 왔다). 최신부터 받아야 잘려도 최신이 남는다.
      .order("run_date", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[admin/khidi/ai-regression] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }
    return Response.json({ ok: true, runs: data || [] });
  } catch (err: any) {
    console.error("[admin/khidi/ai-regression] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
