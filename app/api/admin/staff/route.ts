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

// DELETE /api/admin/staff?userId=xxx — 소프트 삭제(역할 해제). 계정·기록은 보존.
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ ok: false, error: "userId required" }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const current = userRes?.user;
    if (!current) {
      return Response.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }
    // app_metadata 에서 role 만 제거 (계정·상담기록 연결 유지 → 되돌리기 가능)
    const nextMeta = { ...(current.app_metadata || {}) };
    delete nextMeta.role;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { ...nextMeta, role: null },
    });
    if (error) {
      console.error("[admin/staff] DELETE (role remove) failed:", error.message);
      return Response.json({ ok: false, error: "role_remove_failed" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/staff] DELETE error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

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
    // 관리자가 지정한 임시 비밀번호 (없으면 기본값). 직원이 이메일+이 비번으로 바로 로그인.
    const password = String(body.password || "").trim() || "healo1234";

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
    // Supabase 기본 비밀번호 정책: 최소 6자
    if (password.length < 6) {
      return Response.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    let target = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === email
    );
    let createdNew = false;

    if (!target) {
      // 신규: 관리자 지정 임시 비번으로 바로 생성 (직원이 이메일+비번으로 로그인)
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
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
      // 기존: 역할 부여 + 비밀번호 재설정
      const { error: updErr } = await supabase.auth.admin.updateUserById(target.id, {
        password,
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

    // 직원에게 전달할 로그인 정보 (이메일 + 방금 설정한 임시 비번)
    return Response.json({ ok: true, userId: target.id, role, createdNew, loginEmail: email, tempPassword: password });
  } catch (err: any) {
    console.error("[admin/staff] POST error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
