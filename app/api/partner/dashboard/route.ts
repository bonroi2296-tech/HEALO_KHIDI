export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date();
    // KST(한국 영업일) 기준 경계로 계산 후 UTC instant 로 변환.
    // (과거엔 서버 로컬=UTC 자정 기준이라 오늘/주/월 집계가 ~9시간 어긋났음)
    const KST = 9 * 60 * 60 * 1000;
    const k = new Date(now.getTime() + KST);
    const y = k.getUTCFullYear(), mo = k.getUTCMonth(), d = k.getUTCDate(), dow = k.getUTCDay();
    const todayStart = new Date(Date.UTC(y, mo, d) - KST).toISOString();
    const weekStart = new Date(Date.UTC(y, mo, d - dow) - KST).toISOString();
    const monthStart = new Date(Date.UTC(y, mo, 1) - KST).toISOString();

    // Total leads
    const { count: totalLeads } = await supabase
      .from("hospital_leads")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", auth.hospitalId);

    // Today
    const { count: todayLeads } = await supabase
      .from("hospital_leads")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", auth.hospitalId)
      .gte("assigned_at", todayStart);

    // This week
    const { count: weekLeads } = await supabase
      .from("hospital_leads")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", auth.hospitalId)
      .gte("assigned_at", weekStart);

    // This month
    const { count: monthLeads } = await supabase
      .from("hospital_leads")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", auth.hospitalId)
      .gte("assigned_at", monthStart);

    // 경영지표용 — 리드 전체를 한 번에 끌어와 JS에서 집계(병원당 건수 적음).
    const { data: allLeads } = await supabase
      .from("hospital_leads")
      .select("status, assigned_at, first_response_at, quoted_price_min, quoted_price_max, quoted_price")
      .eq("hospital_id", auth.hospitalId);

    const statusCounts: Record<string, number> = {};
    let respondedCount = 0;
    let responseMinutesSum = 0;
    let convertedValue = 0; // 치료 확정 리드의 견적 합계 (예상 매출)
    for (const lead of allLeads || []) {
      if (lead.status) statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      if (lead.first_response_at && lead.assigned_at) {
        const mins = (new Date(lead.first_response_at).getTime() - new Date(lead.assigned_at).getTime()) / 60000;
        if (mins >= 0) { respondedCount++; responseMinutesSum += mins; }
      }
      if (lead.status === "converted") {
        // 상한가 우선, 없으면 하한가, 그것도 없으면 레거시 단일가
        const price = Number(lead.quoted_price_max ?? lead.quoted_price_min ?? lead.quoted_price ?? 0);
        if (Number.isFinite(price)) convertedValue += price;
      }
    }

    const total = totalLeads || 0;
    const converted = statusCounts["converted"] || 0;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    const avgResponseMinutes = respondedCount > 0 ? Math.round(responseMinutesSum / respondedCount) : null;
    // 병원이 응답해야 할 대기 건 (전달됨/조회됨 — 아직 응답 전)
    const pendingCount = (statusCounts["sent"] || 0) + (statusCounts["viewed"] || 0);

    // 응답 필요 큐 — 오래 기다린 순
    const { data: actionQueue } = await supabase
      .from("hospital_leads")
      .select(`
        id, status, assigned_at,
        normalized_inquiries (id, treatment_slug, objective, country, language)
      `)
      .eq("hospital_id", auth.hospitalId)
      .in("status", ["sent", "viewed"])
      .order("assigned_at", { ascending: true })
      .limit(10);

    return Response.json({
      ok: true,
      stats: {
        totalLeads: total,
        todayLeads: todayLeads || 0,
        weekLeads: weekLeads || 0,
        monthLeads: monthLeads || 0,
        conversionRate,
        avgResponseMinutes,
        pendingCount,
        convertedValue,
        statusCounts,
      },
      actionQueue: actionQueue || [],
    });
  } catch (err: any) {
    console.error("[partner/dashboard] GET error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
