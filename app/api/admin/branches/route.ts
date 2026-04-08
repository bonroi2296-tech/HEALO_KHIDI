import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../src/lib/supabase/server";

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
 * GET /api/admin/branches
 * List all partner hospital branches
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("partner_branches")
      .select("*, partner_doctors(count)")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/branches] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/branches
 * Create a new branch
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      branch_code, name_ko, name_en, address_ko, address_en,
      phone, status, i18n, display_order,
    } = body;

    if (!branch_code || !name_ko) {
      return NextResponse.json({ ok: false, error: "branch_code and name_ko are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("partner_branches")
      .insert({
        branch_code,
        name_ko, name_en: name_en || null,
        address_ko: address_ko || null, address_en: address_en || null,
        phone: phone || null,
        status: status || "registered",
        i18n: i18n || {},
        display_order: display_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    console.error("[admin/branches] POST error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/branches
 * Update a branch (requires id in body)
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

    const allowed = [
      "branch_code", "name_ko", "name_en", "address_ko", "address_en",
      "phone", "status", "i18n", "display_order",
    ];
    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("partner_branches")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/branches] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/branches
 * Delete a branch (only if no active doctors)
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

    // Check for active doctors
    const { count } = await supabase
      .from("partner_doctors")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", id)
      .eq("is_active", true);

    if (count && count > 0) {
      return NextResponse.json(
        { ok: false, error: `Cannot delete branch with ${count} active doctor(s). Deactivate them first.` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("partner_branches")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Branch deleted" });
  } catch (err: any) {
    console.error("[admin/branches] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
