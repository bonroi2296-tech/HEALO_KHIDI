export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "../../../../../src/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "../../../../../src/lib/supabase/server";

const VALID_STATUSES = ["sent", "viewed", "replied", "converted", "rejected"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  if (auth.role === "viewer") {
    return Response.json({ ok: false, error: "viewer_cannot_update" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Verify lead belongs to this hospital
    const { data: existing, error: findErr } = await supabase
      .from("hospital_leads")
      .select("id, hospital_id, status")
      .eq("id", id)
      .single();

    if (findErr || !existing) {
      return Response.json({ ok: false, error: "lead_not_found" }, { status: 404 });
    }

    if (existing.hospital_id !== auth.hospitalId) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    const updates: any = { last_status_at: new Date().toISOString() };

    if (body.status && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status;
      if (body.status === "replied" && !(existing as any).first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
    }

    if (body.quoted_price_min !== undefined) updates.quoted_price_min = body.quoted_price_min;
    if (body.quoted_price_max !== undefined) updates.quoted_price_max = body.quoted_price_max;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabase
      .from("hospital_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[partner/leads/id] Update error:", error.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, lead: data });
  } catch (err: any) {
    console.error("[partner/leads/id] Exception:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
