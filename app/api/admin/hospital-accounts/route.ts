export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";

/**
 * GET: 특정 병원의 담당자 목록 조회
 * Query: ?hospital_id=uuid
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospital_id");

  try {
    const supabase = createServiceRoleClient();

    if (hospitalId) {
      const { data, error } = await supabase
        .from("hospital_users")
        .select("id, user_id, hospital_id, role, is_active, created_at, hospitals(name)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (error) {
        return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
      }

      // Resolve emails from auth.users via service client
      const enriched: any[] = [];
      for (const hu of data || []) {
        const { data: userData } = await supabase.auth.admin.getUserById((hu as any).user_id);
        enriched.push({
          ...hu,
          email: userData?.user?.email || "unknown",
          hospitalName: (hu as any).hospitals?.name || "",
        });
      }

      return Response.json({ ok: true, accounts: enriched });
    }

    // No hospital_id: return all hospital_users grouped summary
    const { data, error } = await supabase
      .from("hospital_users")
      .select("id, user_id, hospital_id, role, is_active, created_at, hospitals(name)")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, accounts: data || [] });
  } catch (err: any) {
    console.error("[admin/hospital-accounts] GET error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST: 병원 담당자 등록
 * Body: { hospital_id, email, role? }
 * - Supabase Auth에서 email로 user lookup
 * - 없으면 invite (createUser)
 * - hospital_users에 레코드 생성
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { hospital_id, email, role = "manager" } = body;

    if (!hospital_id || !email) {
      return Response.json({ ok: false, error: "hospital_id and email are required" }, { status: 400 });
    }

    if (!["owner", "manager", "viewer"].includes(role)) {
      return Response.json({ ok: false, error: "invalid role" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify hospital exists
    const { data: hospital, error: hospitalErr } = await supabase
      .from("hospitals")
      .select("id, name")
      .eq("id", hospital_id)
      .single();

    if (hospitalErr || !hospital) {
      return Response.json({ ok: false, error: "hospital_not_found" }, { status: 404 });
    }

    // Find or create user by email
    const { data: userList } = await supabase.auth.admin.listUsers();
    let targetUser = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!targetUser) {
      // Create user with random password (they'll reset via email)
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr || !newUser.user) {
        console.error("[admin/hospital-accounts] createUser failed:", createErr);
        return Response.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
      }
      targetUser = newUser.user;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from("hospital_users")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("hospital_id", hospital_id)
      .limit(1)
      .single();

    if (existing) {
      return Response.json({ ok: false, error: "already_registered" }, { status: 409 });
    }

    // Create hospital_users record
    const { data: newRecord, error: insertErr } = await supabase
      .from("hospital_users")
      .insert({
        user_id: targetUser.id,
        hospital_id,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[admin/hospital-accounts] insert failed:", insertErr);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      account: {
        ...newRecord,
        email: targetUser.email,
        hospitalName: hospital.name,
      },
    });
  } catch (err: any) {
    console.error("[admin/hospital-accounts] POST error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * DELETE: 병원 담당자 비활성화
 * Query: ?id=hospital_users_id
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ ok: false, error: "id_required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("hospital_users")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/hospital-accounts] DELETE error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
