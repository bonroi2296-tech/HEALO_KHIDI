/**
 * HEALO: 회원(환자) 관리 API — admin 전용
 *
 * GET  /api/admin/users              → 환자(직원/관리자 제외) 목록 + 상담 횟수
 * GET  /api/admin/users?userId=xxx   → 특정 환자 상세 (상담 이력 포함)
 * PATCH /api/admin/users             → { userId, action: "ban"|"unban"|"reset_password", password? }
 *
 * 보안: requireAdminAuth, service_role, 권한 판정은 app_metadata.role.
 * 소프트 삭제 원칙 — 계정·기록 보존, ban(비활성화)만.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createServiceRoleClient } from "../../../../src/lib/supabase/server";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";

const STAFF_ROLES = ["doctor", "coordinator", "admin"];

function isBanned(u: any) {
  const until = u.banned_until ? new Date(u.banned_until).getTime() : 0;
  return until > Date.now();
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const userId = request.nextUrl.searchParams.get("userId");

    // ── 상세: 특정 환자 + 상담 이력 ──
    if (userId) {
      const { data: userRes } = await supabase.auth.admin.getUserById(userId);
      const u = userRes?.user;
      if (!u) return Response.json({ ok: false, error: "user_not_found" }, { status: 404 });

      const { data: consultations } = await supabase
        .from("consultation_sessions")
        .select("id, session_type, status, scheduled_at, doctor_user_id, created_at")
        .eq("patient_user_id", userId)
        .order("scheduled_at", { ascending: false })
        .limit(50);

      return Response.json({
        ok: true,
        user: {
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || null,
          country: u.user_metadata?.country || null,
          language: u.user_metadata?.preferred_language || u.user_metadata?.language || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          banned: isBanned(u),
        },
        consultations: consultations || [],
      });
    }

    // ── 목록: 환자(직원/관리자 제외) ──
    const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error("[admin/users] listUsers error:", error.message);
      return Response.json({ ok: false, error: "list_failed" }, { status: 500 });
    }

    // 상담 횟수 집계 (파일럿 규모 — 전체 fetch 후 JS 집계)
    const { data: sessions } = await supabase
      .from("consultation_sessions")
      .select("patient_user_id");
    const countByPatient = {};
    (sessions || []).forEach((s) => {
      if (s.patient_user_id) countByPatient[s.patient_user_id] = (countByPatient[s.patient_user_id] || 0) + 1;
    });

    // 이메일 allowlist 로만 admin 인 계정도 환자 목록에서 제외
    const adminEmails = new Set(
      (process.env.ADMIN_EMAIL_ALLOWLIST || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    );
    const patients = (list.users || [])
      .filter((u) => !STAFF_ROLES.includes(u.app_metadata?.role) && !adminEmails.has((u.email || "").toLowerCase()))
      .map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || null,
        country: u.user_metadata?.country || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        banned: isBanned(u),
        consultation_count: countByPatient[u.id] || 0,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return Response.json({ ok: true, patients, total: patients.length });
  } catch (err: any) {
    console.error("[admin/users] GET error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const userId = String(body.userId || "");
    const action = String(body.action || "");
    if (!userId || !action) {
      return Response.json({ ok: false, error: "userId and action required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (action === "ban") {
      // 소프트 비활성화 — 100년 ban (계정·기록 보존, 로그인만 차단)
      const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (error) throw error;
      return Response.json({ ok: true, banned: true });
    }
    if (action === "unban") {
      const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw error;
      return Response.json({ ok: true, banned: false });
    }
    if (action === "reset_password") {
      const password = String(body.password || "").trim();
      if (password.length < 6) {
        return Response.json({ ok: false, error: "password_too_short" }, { status: 400 });
      }
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (err: any) {
    console.error("[admin/users] PATCH error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
