/**
 * healwith: 의료진 관리 API (admin 전용)
 *
 * 보안:
 * - requireAdminAuth (Bearer/쿠키 기반 app_metadata.role + ADMIN_EMAIL_ALLOWLIST)
 * - 실패 시 audit log 자동 기록
 * - service_role 클라이언트 사용 (RLS 우회하되 admin 권한 확인 후)
 *
 * ⚠️ 과거 코드가 쓰던 `profiles.role` 체크는 클라이언트에서 self-insert 가능성이
 * 있어 권한 판정에 사용 금지. (user_metadata.role 권한상승 이슈와 같은 패턴)
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

/**
 * GET /api/admin/doctors
 * List all doctors, optionally filtered by branch_id
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branch_id");

    let query = supabaseAdmin
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
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }
}

/**
 * POST /api/admin/doctors
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  try {
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

    const { data, error } = await supabaseAdmin
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
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/doctors
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
      "branch_id", "name_ko", "name_en", "position_ko", "position_en",
      "photo_url", "listing_photo_url", "subspecialty",
      "career", "education", "activities", "publications", "keywords",
      "i18n", "display_order", "is_active",
    ];
    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabaseAdmin
      .from("partner_doctors")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[admin/doctors] PUT error:", err);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/doctors
 * Soft-delete a doctor (set is_active = false)
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

    const { error } = await supabaseAdmin
      .from("partner_doctors")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Doctor deactivated" });
  } catch (err: any) {
    console.error("[admin/doctors] DELETE error:", err);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
