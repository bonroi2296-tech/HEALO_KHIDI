/**
 * healwith KHIDI KPI 집계 API
 *
 * GET /api/admin/khidi/kpi?year=2026&month=5
 *
 * 권한: admin only (requireAdminAuth)
 * 반환: KpiResult + 일별 시계열
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  getKpiForMonth,
  getKpiCumulative,
  getDailyKpiSeries,
} from "@/lib/khidi/kpi";
import { KHIDI_TARGETS, PROJECT_START_DATE, PROJECT_END_DATE } from "@/lib/khidi/targets";

// 공식 목표 (8/27 중간평가 기준 — src/lib/khidi/targets.ts SoR). 누적(사업 전체) 기준.
const KPI_TARGETS = KHIDI_TARGETS;

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return Response.json(
      { ok: false, error: "invalid_params", detail: "year, month 범위를 확인하세요" },
      { status: 400 }
    );
  }

  try {
    // 누적(사업 전체) 종료일: min(오늘+1, 사업종료+1) — toDate 는 exclusive
    const now2 = new Date();
    const projEndExclusive = new Date(`${PROJECT_END_DATE}T00:00:00+09:00`);
    projEndExclusive.setDate(projEndExclusive.getDate() + 1);
    const tomorrow = new Date(now2);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const cumToDate = (tomorrow < projEndExclusive ? tomorrow : projEndExclusive)
      .toISOString()
      .slice(0, 10);

    const [kpi, daily, cumulative] = await Promise.all([
      getKpiForMonth(year, month),
      getDailyKpiSeries(year, month),
      getKpiCumulative(PROJECT_START_DATE, cumToDate),
    ]);

    return Response.json({
      ok: true,
      year,
      month,
      kpi,
      // 사업 누적 집계 (8/27 평가표의 "현재(B)" 값 — 유치/상담+사후/만족도)
      cumulative,
      targets: KPI_TARGETS,
      daily,
    });
  } catch (err) {
    console.error("[api/admin/khidi/kpi] error:", (err as Error).message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
