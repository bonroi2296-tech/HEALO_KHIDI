/**
 * HEALO: 직원(의사/코디네이터) 계정 관리 API — admin 전용
 *
 * GET  /api/admin/staff           → role=doctor/coordinator 회원 목록
 * POST /api/admin/staff           → { email, role, name? } 계정 생성(또는 기존 계정에 역할 부여)
 *                                    + 비밀번호 설정 링크(recovery) 반환
 *
 * 보안:
 * - requireAdminAuth (app_metadata.role 기준)
 * - 권한은 항상 app_metadata.role 에 기록 (user_metadata 금지 — 권한상승 방지)
 * - service_role 클라이언트 (admin 확인 후 사용)
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

const ALLOWED_ROLES = ["doctor", "coordinator"];

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error("[admin/staff] listUsers error:", error.message);
      return Response.json({ ok: false, error: "list_failed" }, { status: 500 });
    }
    const staff = (data.users || [])
      .filter((u: any) => ALLOWED_ROLES.includes(u.app_metadata?.role))
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.app_metadata?.role || null,
        full_name: u.user_metadata?.full_name || null,
        created_at: u.created_at,
      }));
    return Response.json({ ok: true, staff });
  } catch (err: any) {
    console.error("[admin/staff] GET error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");
    const fullName =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 100)
        : undefined;

    if (!email || !role) {
      return Response.json({ ok: false, error: "email and role required" }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return Response.json({ ok: false, error: "invalid_role" }, { status: 400 });
    }
    // 간단 이메일 형식 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    let target = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === email
    );
    let createdNew = false;

    if (!target) {
      // 신규: 임시 비번으로 생성 → 본인이 recovery 링크로 비번 설정
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (createErr || !created?.user) {
        console.error("[admin/staff] createUser failed:", createErr);
        return Response.json({ ok: false, error: "user_creation_failed" }, { status: 500 });
      }
      target = created.user;
      createdNew = true;
    } else {
      // 기존: 역할만 부여/갱신
      const { error: updErr } = await supabase.auth.admin.updateUserById(target.id, {
        app_metadata: { ...(target.app_metadata || {}), role },
        ...(fullName
          ? { user_metadata: { ...(target.user_metadata || {}), full_name: fullName } }
          : {}),
      });
      if (updErr) {
        console.error("[admin/staff] updateUser failed:", updErr);
        return Response.json({ ok: false, error: "role_update_failed" }, { status: 500 });
      }
    }

    // 비밀번호 설정용 링크 (admin 이 직원에게 전달) — Supabase SMTP 미설정이어도 링크 자체는 생성됨
    let setupLink: string | null = null;
    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      setupLink = (linkData as any)?.properties?.action_link || null;
    } catch {
      // 링크 생성 실패해도 계정/역할은 정상 — 링크는 부가 기능
    }

    return Response.json({ ok: true, userId: target.id, role, createdNew, setupLink });
  } catch (err: any) {
    console.error("[admin/staff] POST error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
