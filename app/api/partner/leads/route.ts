export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "../../../../src/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("hospital_leads")
      .select(`
        id, status, assigned_at, first_response_at, last_status_at,
        quoted_price_min, quoted_price_max, notes, metadata,
        normalized_inquiries (
          id, language, country, treatment_slug, objective, source_type, created_at
        )
      `, { count: "exact" })
      .eq("hospital_id", auth.hospitalId)
      .order("assigned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Hospital Leads] Query error:", error.message);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      leads: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("[Hospital Leads] Error:", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
