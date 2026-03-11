export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkHospitalAuth } from "../../../../src/lib/auth/checkHospitalAuth";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";
import { extractKrFields, detectPayloadLanguage, triggerMultiLangTranslation } from "../../../../src/lib/translate";

const EDITABLE_FIELDS = [
  "name",
  "description",
  "images",
  "tags",
  "amenities",
  "supported_languages",
  "operating_hours",
  "doctor_profile",
  "thumbnail_image",
  "gallery_images",
  "specialties",
  "medical_equipment",
  "certifications",
  "faq",
  "location_kr",
  "name_kr",
  "description_kr",
  "tags_kr",
  "specialties_kr",
  "i18n",
];

export async function GET(request: NextRequest) {
  const auth = await checkHospitalAuth(request);
  if (!auth.isHospitalUser || !auth.hospitalId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .eq("id", auth.hospitalId)
      .single();

    if (error || !data) {
      return Response.json({ ok: false, error: "hospital_not_found" }, { status: 404 });
    }

    return Response.json({ ok: true, hospital: data, editableFields: EDITABLE_FIELDS });
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
    return Response.json({ ok: false, error: "viewer_cannot_edit" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const updates: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ ok: false, error: "no_editable_fields" }, { status: 400 });
    }

    const krFields = extractKrFields(updates);
    const finalUpdates = { ...updates, ...krFields };

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("hospitals")
      .update(finalUpdates)
      .eq("id", auth.hospitalId)
      .select()
      .single();

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const hasTranslatableContent = updates.name || updates.description || updates.tags || updates.specialties || updates.location_kr;
    if (hasTranslatableContent) {
      triggerMultiLangTranslation("hospitals", auth.hospitalId, updates, supabase).catch((e) =>
        console.error("[hospital/profile] translation error:", e.message)
      );
    }

    return Response.json({ ok: true, hospital: data });
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
