/**
 * HEALO: 관리자 애널리틱스 API
 *
 * 경로: /api/admin/analytics
 * 권한: 관리자 전용
 *
 * 목적:
 * - /admin/analytics 대시보드용 집계 데이터 제공
 * - inquiries.treatment_type 카운트 기반 트렌드 집계
 * - PII(이메일/메시지) 일절 반환 안 함, 카테고리 카운트만 반환
 *
 * 🔒 보안 정책:
 * - 관리자 권한 필수 (requireAdminAuth)
 * - RLS ON 상태에서 service_role 로 안전히 집계
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

type TreatmentTrend = {
  name: string;
  count: number;
  percent: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    assertSupabaseEnv();

    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("treatment_type")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/analytics] inquiries fetch error:", error.message);
      return Response.json(
        { ok: false, error: "fetch_failed", detail: error.message },
        { status: 500 }
      );
    }

    const inquiries = data || [];
    const totalLeads = inquiries.length;
    const avgPrice = 3500; // 기존 대시보드와 동일한 상수
    const totalRevenue = totalLeads * avgPrice;

    const typeCounts: Record<string, number> = {};
    inquiries.forEach((row) => {
      const type = (row as { treatment_type?: string | null }).treatment_type || "Unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const treatmentTrends: TreatmentTrend[] = Object.entries(typeCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topTreatment = treatmentTrends[0]?.name || "-";

    return Response.json({
      ok: true,
      totalRevenue,
      totalLeads,
      topTreatment,
      hospitalOpportunities: [],
      treatmentTrends,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/analytics] unexpected error:", msg);
    return Response.json(
      { ok: false, error: "internal_error", detail: msg },
      { status: 500 }
    );
  }
}
