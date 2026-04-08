import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase/server";

// Admin auth check helper
async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  return user;
}

/**
 * GET /api/admin/doctors
 * List all doctors, optionally filtered by branch_id
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branch_id");

    let query = supabase
      .from("partner_doctors")
      .select("*, partner_branches(id, name_ko, name_en, branch_code)")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/doctors] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/doctors
 * Create a new doctor
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      branch_id, name_ko, name_en, position_ko, position_en,
      photo_url, listing_photo_url, subspecialty,
      career, education, activities, publications, keywords,
      i18n, display_order, is_active,
    } = body;

    if (!branch_id || !name_ko) {
      return NextResponse.json({ ok: false, error: "branch_id and name_ko are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("partner_doctors")
      .insert({
        branch_id,
        name_ko, name_en: name_en || null,
        position_ko, position_en: position_en || null,
        photo_url: photo_url || null,
        listing_photo_url: listing_photo_url || null,
        subspecialty: subspecialty || null,
        career: career || [],
        education: education || [],
        activities: activities || [],
        publications: publications || [],
        keywords: keywords || [],
        i18n: i18n || {},
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    console.error("[admin/doctors] POST error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/doctors
 * Update a doctor (requires id in body)
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    // Sanitize: only allow known fields
    const allowed = [
      "branch_id", "name_ko", "name_en", "position_ko", "position_en",
      "photo_url", "listing_photo_url", "subspecialty",
      "career", "education", "activities", "publications", "keywords",
      "i18n", "display_order", "is_active",
    ];
    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("partner_doctors")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/doctors] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/doctors
 * Soft-delete a doctor (set is_active = false)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("partner_doctors")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Doctor deactivated" });
  } catch (err: any) {
    console.error("[admin/doctors] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
