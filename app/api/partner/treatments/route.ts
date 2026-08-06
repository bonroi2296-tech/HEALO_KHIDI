export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "@/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { triggerMultiLangTranslation, hasTranslatableField } from "@/lib/translate";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

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
      console.error("[partner/treatments] GET error:", error);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, treatments: data || [], total: count || 0 });
  } catch (err: any) {
    console.error("[partner/treatments] GET exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
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

    // 실DB 표의 모양으로 못박는다 — 없는 칸이 섞이면 여기서 걸린다(Record<string, any> 면 안 걸린다)
    const payload: TablesInsert<"treatments"> = {
      hospital_id: auth.hospitalId,
      name: body.name?.trim() || "새 시술",
      slug,
      description: body.description || null,
      full_description: body.full_description || null,
      price_min: body.price_range_min ?? body.price_min ?? null,
      price_max: body.price_range_max ?? body.price_max ?? null,
      currency: body.currency || "USD",
      images: body.images || [],
      tags: body.tags || [],
      benefits: body.benefits || [],
      // ponytail: 실DB `treatments` 에 있는 서술 필드는 아래 4개(글자형)뿐이다.
      // 옛 미용시술 스키마의 category·recovery_time_min/max·side_effects·anesthesia_type·
      // surgery_duration_*·before_after_images·price_includes 는 실제 컬럼이 아니라서
      // 이 insert 를 통째로 실패시키고 있었다(치료 등록 5개월간 0건).
      duration: body.duration || null,
      recovery_time: body.recovery_time || null,
      preparation: body.preparation || null,
      risks: body.risks || null,
      is_published: body.is_published ?? false,
      display_order: body.display_order || null,
    };

    const { data, error } = await supabase
      .from("treatments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[partner/treatments] POST error:", error);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    if (hasTranslatableField(payload)) {
      triggerMultiLangTranslation("treatments", data.id, payload, supabase).catch((e) =>
        console.error("[hospital/treatments] translation error:", e.message)
      );
    }

    return Response.json({ ok: true, treatment: data });
  } catch (err: any) {
    console.error("[partner/treatments] POST exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
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

    // 실DB `treatments` 에 실제로 있는 컬럼만. (위 POST 주석 참고)
    const EDITABLE = [
      "name", "description", "full_description",
      "price_min", "price_max", "currency",
      "images", "tags", "benefits",
      "duration", "recovery_time", "preparation", "risks",
      "is_published", "display_order",
      "i18n",
    ];
    // 실DB 표의 모양으로 못박는다 — 없는 칸이 섞이면 여기서 걸린다(Record<string, any> 면 안 걸린다)
    const updates: TablesUpdate<"treatments"> = {};
    for (const field of EDITABLE) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (body.price_range_min !== undefined && updates.price_min === undefined) updates.price_min = body.price_range_min;
    if (body.price_range_max !== undefined && updates.price_max === undefined) updates.price_max = body.price_range_max;

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
      console.error("[partner/treatments] PATCH error:", error);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    if (hasTranslatableField(updates)) {
      triggerMultiLangTranslation("treatments", id, updates, supabase).catch((e) =>
        console.error("[hospital/treatments] translation error:", e.message)
      );
    }

    return Response.json({ ok: true, treatment: data });
  } catch (err: any) {
    console.error("[partner/treatments] PATCH exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
