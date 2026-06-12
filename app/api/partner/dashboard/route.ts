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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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

    // Status breakdown
    const { data: allLeads } = await supabase
      .from("hospital_leads")
      .select("status")
      .eq("hospital_id", auth.hospitalId);

    const statusCounts: Record<string, number> = {};
    for (const lead of allLeads || []) {
      if (!lead.status) continue;
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }

    // Recent 5
    const { data: recentLeads } = await supabase
      .from("hospital_leads")
      .select(`
        id, status, assigned_at,
        normalized_inquiries (id, treatment_slug, objective, country, language)
      `)
      .eq("hospital_id", auth.hospitalId)
      .order("assigned_at", { ascending: false })
      .limit(5);

    // Treatment count
    const { count: treatmentCount } = await supabase
      .from("treatments")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", auth.hospitalId);

    return Response.json({
      ok: true,
      stats: {
        totalLeads: totalLeads || 0,
        todayLeads: todayLeads || 0,
        weekLeads: weekLeads || 0,
        monthLeads: monthLeads || 0,
        treatmentCount: treatmentCount || 0,
        statusCounts,
      },
      recentLeads: recentLeads || [],
    });
  } catch (err: any) {
    console.error("[partner/dashboard] GET error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
