/**
 * healwith: 에이전시 관리 API (어드민)
 *
 * GET    → 에이전시 목록 + 담당자 수
 * POST   { name, country?, code? }            → 에이전시 생성
 * POST   { agency_id, email }                 → 에이전시 담당자 계정 발급(임시비번 반환)
 * DELETE ?user_id=&agency_id=                 → 담당자 비활성화
 *
 * hospital-accounts 패턴 미러. 권한은 app_metadata.role='agency'.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const supabase = createServiceRoleClient() as any;
    const { data: agencies, error } = await supabase
      .from("agencies").select("id, name, country, code, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });

    const { data: users } = await supabase
      .from("agency_users").select("agency_id, user_id, is_active");
    const countMap = new Map<string, number>();
    (users || []).forEach((u: any) => {
      if (u.is_active) countMap.set(u.agency_id, (countMap.get(u.agency_id) || 0) + 1);
    });

    return Response.json({
      ok: true,
      agencies: (agencies || []).map((a: any) => ({ ...a, userCount: countMap.get(a.id) || 0 })),
    });
  } catch (err: any) {
    console.error("[admin/agencies] GET error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient() as any;

    // (A) 담당자 계정 발급
    if (body.agency_id && body.email) {
      const email = String(body.email).trim().toLowerCase();
      const { data: agency } = await supabase.from("agencies").select("id, name").eq("id", body.agency_id).single();
      if (!agency) return Response.json({ ok: false, error: "agency_not_found" }, { status: 404 });

      const { data: userList } = await supabase.auth.admin.listUsers();
      let targetUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email);
      let tempPassword: string | null = null;
      if (!targetUser) {
        tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email, password: tempPassword, email_confirm: true,
          app_metadata: { role: "agency" },
        });
        if (createErr || !newUser?.user) return Response.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
        targetUser = newUser.user;
      } else {
        // 기존 유저면 role 부여 (권한은 app_metadata)
        await supabase.auth.admin.updateUserById(targetUser.id, {
          app_metadata: { ...(targetUser.app_metadata || {}), role: "agency" },
        });
      }

      const { data: existing } = await supabase
        .from("agency_users").select("id").eq("user_id", targetUser.id).eq("agency_id", body.agency_id).limit(1).maybeSingle();
      if (existing) return Response.json({ ok: false, error: "already_registered" }, { status: 409 });

      const { error: insErr } = await supabase.from("agency_users").insert({
        user_id: targetUser.id, agency_id: body.agency_id, role: "member", is_active: true,
      });
      if (insErr) return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });

      return Response.json({ ok: true, email, tempPassword, agencyName: agency.name });
    }

    // (B) 에이전시 생성
    if (body.name) {
      const { data, error } = await supabase.from("agencies").insert({
        name: String(body.name).slice(0, 200),
        country: body.country ? String(body.country).slice(0, 100) : null,
        code: body.code ? String(body.code).slice(0, 50) : null,
        contact_email: body.contact_email ? String(body.contact_email).slice(0, 200) : null,
      }).select("id").single();
      if (error) return Response.json({ ok: false, error: "create_failed" }, { status: 500 });
      return Response.json({ ok: true, id: data.id });
    }

    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  } catch (err: any) {
    console.error("[admin/agencies] POST error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const agencyId = searchParams.get("agency_id");
  if (!userId || !agencyId) return Response.json({ ok: false, error: "params_required" }, { status: 400 });
  try {
    const supabase = createServiceRoleClient() as any;
    const { error } = await supabase.from("agency_users").update({ is_active: false })
      .eq("user_id", userId).eq("agency_id", agencyId);
    if (error) return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
