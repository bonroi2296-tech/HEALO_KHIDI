/**
 * HEALO: 병원 지점(Branch) 관리 API (admin 전용)
 *
 * 보안: requireAdminAuth (Bearer/쿠키 기반).
 * ⚠️ 과거 checkAdmin(profiles.role) 패턴 제거 — 같은 escalation 벡터 가능.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

/**
 * GET /api/admin/branches
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("partner_branches")
      .select("*, partner_doctors(count)")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/branches] GET error:", err);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }
}

/**
 * POST /api/admin/branches
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const {
      branch_code, name_ko, name_en, address_ko, address_en,
      phone, status, i18n, display_order,
    } = body;

    if (!branch_code || !name_ko) {
      return NextResponse.json({ ok: false, error: "branch_code and name_ko are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
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
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/branches
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
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

    const { data, error } = await supabaseAdmin
      .from("partner_branches")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/branches] PUT error:", err);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/branches
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const { count } = await supabaseAdmin
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

    const { error } = await supabaseAdmin
      .from("partner_branches")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Branch deleted" });
  } catch (err: any) {
    console.error("[admin/branches] DELETE error:", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
