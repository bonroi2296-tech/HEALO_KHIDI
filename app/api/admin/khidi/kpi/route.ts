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
  getDailyKpiSeries,
} from "@/lib/khidi/kpi";

// 사업 목표 (KHIDI 공고 기준)
const KPI_TARGETS = {
  preConsultation: 80,  // K-02
  followUp: null,       // K-04: 목표 없음 (가산점)
  attraction: 10,       // K-01
  satisfaction: 80,     // K-03
};

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
    const [kpi, daily] = await Promise.all([
      getKpiForMonth(year, month),
      getDailyKpiSeries(year, month),
    ]);

    return Response.json({
      ok: true,
      year,
      month,
      kpi,
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
