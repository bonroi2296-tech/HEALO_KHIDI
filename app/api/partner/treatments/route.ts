export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "../../../../src/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";
import { extractKrFields, triggerMultiLangTranslation } from "../../../../src/lib/translate";

export async function GET(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error, count } = await supabase
      .from("treatments")
      .select("*", { count: "exact" })
      .eq("hospital_id", auth.hospitalId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, treatments: data || [], total: count || 0 });
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  if (auth.role === "viewer") {
    return Response.json({ ok: false, error: "viewer_cannot_create" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();

    const slug = (body.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "") || `treatment-${Date.now()}`;

    const payload: Record<string, any> = {
      hospital_id: auth.hospitalId,
      name: body.name?.trim() || "새 시술",
      slug,
      description: body.description || null,
      full_description: body.full_description || null,
      category: body.category || null,
      price_min: body.price_range_min ?? body.price_min ?? null,
      price_max: body.price_range_max ?? body.price_max ?? null,
      currency: body.currency || "USD",
      images: body.images || [],
      tags: body.tags || [],
      benefits: body.benefits || [],
      recovery_time_min: body.recovery_time_min ?? null,
      recovery_time_max: body.recovery_time_max ?? null,
      side_effects: body.side_effects || [],
      precautions: body.precautions || [],
      anesthesia_type: body.anesthesia_type || null,
      surgery_duration_min: body.surgery_duration_min ?? null,
      surgery_duration_max: body.surgery_duration_max ?? null,
      is_published: body.is_published ?? false,
      display_order: body.display_order || null,
      before_after_images: body.before_after_images || [],
      price_includes: body.price_includes || [],
      ...extractKrFields({ name: body.name, description: body.description, tags: body.tags }),
    };

    const { data, error } = await supabase
      .from("treatments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (payload.name || payload.description || payload.tags) {
      triggerMultiLangTranslation("treatments", data.id, payload, supabase).catch((e) =>
        console.error("[hospital/treatments] translation error:", e.message)
      );
    }

    return Response.json({ ok: true, treatment: data });
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  if (auth.role === "viewer") {
    return Response.json({ ok: false, error: "viewer_cannot_update" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ ok: false, error: "id_required" }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Verify belongs to this hospital
    const { data: existing, error: findErr } = await supabase
      .from("treatments")
      .select("id, hospital_id")
      .eq("id", id)
      .single();

    if (findErr || !existing || existing.hospital_id !== auth.hospitalId) {
      return Response.json({ ok: false, error: "treatment_not_found" }, { status: 404 });
    }

    const EDITABLE = [
      "name", "description", "full_description", "category",
      "price_min", "price_max", "currency",
      "images", "tags", "benefits",
      "recovery_time_min", "recovery_time_max",
      "side_effects", "precautions",
      "anesthesia_type", "surgery_duration_min", "surgery_duration_max",
      "is_published", "display_order",
      "before_after_images", "price_includes",
      "name_kr", "description_kr", "tags_kr",
      "i18n",
    ];
    const updates: Record<string, any> = {};
    for (const field of EDITABLE) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (body.price_range_min !== undefined && updates.price_min === undefined) updates.price_min = body.price_range_min;
    if (body.price_range_max !== undefined && updates.price_max === undefined) updates.price_max = body.price_range_max;

    const krFields = extractKrFields(updates);
    Object.assign(updates, krFields);

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: false, error: "no_fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("treatments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (updates.name || updates.description || updates.tags) {
      triggerMultiLangTranslation("treatments", id, updates, supabase).catch((e) =>
        console.error("[hospital/treatments] translation error:", e.message)
      );
    }

    return Response.json({ ok: true, treatment: data });
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
