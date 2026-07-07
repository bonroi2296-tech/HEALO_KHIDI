/**
 * healwith: 로그인한 사용자 본인 비밀번호 변경 (self-service)
 *
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 *
 * 왜 서버 라우트인가:
 *   GoTrue(프로젝트 설정)가 "일반 로그인 세션에서 본인 비번 변경 시 현재비번 필요"를 강제해
 *   클라이언트 `supabase.auth.updateUser({password})`가 "Current password required..."로 거부된다.
 *   클라 SDK는 현재비번을 넣는 자리가 없다(이메일 OTP nonce만 지원). 그래서 서버에서
 *   ①현재비번을 익명 로그인으로 검증하고 ②관리자 권한(updateUserById)으로 바꾼다
 *   (admin 엔드포인트는 그 사용자 제약을 우회 — 실측 확인 2026-07-07).
 */

import "server-only";

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "@/lib/auth/requireConsultationAccess";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// 비번 규칙 — 가입폼/재설정 클라와 동일 (8자 + 영문자 + 특수문자). 서버에서도 재검증.
const SPECIAL_RE = /[!@#$%^&*()_=+{};,.?~|<>[\]/-]/;
function isStrong(pw: unknown): pw is string {
  return (
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[a-zA-Z]/.test(pw) &&
    SPECIAL_RE.test(pw)
  );
}

// 현재비번 무차별 대입 방어: IP당 분당 5회 (인증 헬퍼의 IP 레이트리밋과 별개 계층)
const CHANGE_PW_RATE = { windowMs: 60_000, maxRequests: 5, apiName: "change_password" };

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const ip = getClientIp(request) || "unknown";
    const rl = checkRateLimit(ip, CHANGE_PW_RATE);
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const { userId, email } = auth;
    // 이메일 로그인 수단이 없는 계정(소셜 전용 등)은 변경할 비번 자체가 없음
    if (!email) {
      return Response.json(
        { ok: false, error: "no_password_account" },
        { status: 400 }
      );
    }

    // 비활성(소프트삭제) 계정은 requireAuthenticatedUser(→checkAdminAuth)가 이미 401 로 막는다
    //   (checkAdminAuth 가 disabled 계정엔 userId 를 비워 반환 → 여기 도달 못 함). #677 후속으로
    //   차단을 인증 헬퍼로 승격했으므로 예전의 로컬 getUserById 가드는 제거.

    const body = await request.json().catch(() => ({}));
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return Response.json({ ok: false, error: "current_required" }, { status: 400 });
    }
    if (!isStrong(newPassword)) {
      return Response.json({ ok: false, error: "weak_password" }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return Response.json({ ok: false, error: "same_password" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    // 1) 현재 비번 검증 — 익명 클라로 로그인 시도(세션 저장 안 함). 틀리면 즉시 거부.
    const verifier = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await verifier.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInErr) {
      return Response.json({ ok: false, error: "wrong_current" }, { status: 400 });
    }

    // 2) 관리자 권한으로 비번 변경 (GoTrue의 '현재비번 필요' 사용자 제약 우회)
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) {
      console.error("[change-password] update error:", updErr.message);
      return Response.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[change-password] exception:", error?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
