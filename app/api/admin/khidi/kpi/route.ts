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

    // 평가 직결: 대시보드 조회 경로에서도 집계 쿼리 오류를 흘려보내지 않고 canary 발사.
    // (이전엔 cron 스냅샷 경로만 알림 → PO 가 대시보드로 먼저 보면 깨진 지표가 0 으로
    //  조용히 보였음. POSTMORTEMS #19.) 알림 실패는 응답에 영향 없게 격리.
    const aggErrors = [
      ...((kpi.errors as string[]) || []).map((e) => `month ${year}-${month}: ${e}`),
      ...((cumulative.errors as string[]) || []).map((e) => `cumulative: ${e}`),
    ];
    if (aggErrors.length > 0) {
      try {
        const { alertKpiAggregationErrors } = await import("@/lib/alerts/operationalAlerts");
        await alertKpiAggregationErrors(aggErrors, `dashboard ${year}-${month}`);
      } catch (alertErr) {
        console.error("[api/admin/khidi/kpi] canary 발송 실패:", (alertErr as Error).message);
      }
    }

    return Response.json({
      ok: true,
      year,
      month,
      kpi,
      // 사업 누적 집계 (8/27 평가표의 "현재(B)" 값 — 유치/상담+사후/만족도)
      cumulative,
      targets: KPI_TARGETS,
      daily,
      // 집계 오류가 있으면 대시보드가 경고 배너를 띄울 수 있게 표면화(숫자 0 을 정상으로 오인 방지)
      aggregationOk: aggErrors.length === 0,
    });
  } catch (err) {
    console.error("[api/admin/khidi/kpi] error:", (err as Error).message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
