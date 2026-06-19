/**
 * healwith: 관리자 권한 체크 유틸 (SSR-safe)
 *
 * 목적:
 * - API route에서 관리자 권한 확인
 * - @supabase/ssr의 createServerClient 사용 (쿠키 기반)
 * - 복호화 권한 부여 전 사용
 *
 * 권한 판정 기준 (OR 조건):
 * 1. user.app_metadata.role === "admin"   ← service_role로만 쓸 수 있음
 * 2. 환경변수 ADMIN_EMAIL_ALLOWLIST에 포함된 이메일
 *
 * ⚠️ user_metadata는 `supabase.auth.updateUser({ data: { role: 'admin' } })`로
 * 임의 유저가 자기 자신을 고칠 수 있는 필드이므로 어드민 판정에 사용 금지.
 *
 * 환경변수:
 * - ADMIN_EMAIL_ALLOWLIST: 쉼표로 구분된 관리자 이메일 목록
 *   예: "admin@healwith.co.kr,manager@healwith.co.kr"
 *
 * 사용법:
 * ```ts
 * const authResult = await checkAdminAuth();
 * if (!authResult.isAdmin) {
 *   return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
 * }
 * ```
 */

import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient, createSupabaseServerClientFromRequest } from "../supabase/server";

/**
 * ✅ 환경변수에서 관리자 이메일 화이트리스트 로드
 */
function getAdminEmailAllowlist(): string[] {
  const allowlistEnv = process.env.ADMIN_EMAIL_ALLOWLIST;
  
  if (!allowlistEnv) {
    return [];
  }

  // 쉼표로 구분, trim, 빈 문자열 제거, 소문자 변환
  return allowlistEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * ✅ 관리자 권한 확인 (Bearer token 우선, 쿠키 fallback)
 * 
 * 우선순위:
 * 1. Authorization: Bearer <token> 헤더 → supabaseAdmin.auth.getUser(token)
 * 2. 없으면 쿠키 기반 세션 확인 → createSupabaseServerClient().auth.getUser()
 * 
 * 판정 기준 (OR 조건):
 * 1. user.app_metadata.role === "admin"
 * 2. ADMIN_EMAIL_ALLOWLIST에 포함된 이메일
 *
 * ⚠️ user_metadata.role은 클라이언트가 고칠 수 있어 사용 금지.
 * 
 * @param request NextRequest (optional, for Bearer token)
 * @returns { isAdmin: boolean, userId?: string, email?: string, reason?: string, error?: string, debug?: object }
 */
export async function checkAdminAuth(request?: NextRequest): Promise<{
  isAdmin: boolean;
  userId?: string;
  email?: string;
  appRole?: string;   // app_metadata.role (admin/coordinator/doctor 등) — staff 판정용
  reason?: string;
  authMethod?: string;
  error?: string;
  debug?: Record<string, unknown>;
}> {
  const isDev = process.env.NODE_ENV !== "production";
  const debugInfo: Record<string, unknown> = {};

  try {
    let user: User | null = null;
    let userError: unknown = null;
    let authMethod = "unknown";

    // ========================================
    // 1. Authorization Bearer 토큰 우선 (클라이언트 → 서버)
    // ========================================
    if (request?.headers) {
      const authHeader = request.headers.get?.("authorization") || request.headers.get?.("Authorization");
      
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        
        if (isDev) {
          debugInfo.hasBearerToken = true;
          debugInfo.tokenLength = token?.length || 0;
        }

        try {
          // supabaseAdmin으로 토큰 검증
          const { supabaseAdmin } = await import("../rag/supabaseAdmin");
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          
          user = data?.user;
          userError = error;
          authMethod = "bearer_token";
          
          if (isDev) {
            debugInfo.bearerTokenValid = !!user;
            debugInfo.bearerTokenError = error?.message;
          }
        } catch (err: unknown) {
          console.error("[checkAdminAuth] Bearer token validation error:", err instanceof Error ? err.message : String(err));
          userError = err;
        }
      }
    }

    // ========================================
    // 2. 쿠키 기반 fallback: 요청 쿠키 우선 (Vercel에서 next/headers보다 신뢰)
    // ========================================
    if (!user && request?.cookies) {
      try {
        const supabase = createSupabaseServerClientFromRequest(request);
        const { data, error } = await supabase.auth.getUser();
        user = data?.user;
        userError = error;
        authMethod = "cookie_request";
        if (isDev) {
          debugInfo.cookieAuthAttempted = true;
          debugInfo.cookieAuthValid = !!user;
          debugInfo.cookieAuthError = error?.message;
        }
      } catch (err: unknown) {
        console.error("[checkAdminAuth] Cookie (request) auth error:", err instanceof Error ? err.message : String(err));
        userError = err;
      }
    }
    if (!user) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser();
        user = data?.user;
        userError = error;
        if (!authMethod || authMethod === "unknown") authMethod = "cookie";
        if (isDev) {
          debugInfo.cookieAuthAttempted = true;
          debugInfo.cookieAuthValid = !!user;
          debugInfo.cookieAuthError = error?.message;
        }
      } catch (err: unknown) {
        console.error("[checkAdminAuth] Cookie auth error:", err instanceof Error ? err.message : String(err));
        userError = err;
      }
    }

    // ========================================
    // 3. 유저 확인
    // ========================================
    const userErrorMessage =
      userError instanceof Error
        ? userError.message
        : userError
          ? String((userError as { message?: unknown }).message ?? userError)
          : undefined;
    if (isDev) {
      debugInfo.hasUser = !!user;
      debugInfo.userError = userErrorMessage;
      debugInfo.authMethod = authMethod;
    }

    if (userError || !user) {
      if (isDev) {
        console.warn('[checkAdminAuth] No user:', userErrorMessage || 'no session', 'method:', authMethod);
      }
      return {
        isAdmin: false,
        authMethod,
        error: userErrorMessage || "no_user",
        debug: isDev ? debugInfo : undefined,
      };
    }

    const userEmail = user.email?.trim().toLowerCase();
    const userId = user.id;

    if (isDev) {
      debugInfo.email = userEmail;
      debugInfo.appMetadataRole = user.app_metadata?.role;
      // user_metadata.role은 인증 결정에 사용하지 않음 (클라이언트가 자기 자신을 고칠 수 있음)
    }

    // ========================================
    // 4. 권한 판정 (OR 조건)
    // ========================================

    // 4-1. app_metadata.role === "admin"  (service_role만 쓸 수 있는 필드)
    const appMetadataRole = user.app_metadata?.role;
    if (appMetadataRole === "admin") {
      return {
        isAdmin: true,
        userId,
        email: userEmail,
        appRole: appMetadataRole,
        reason: "app_metadata_role",
        authMethod,
        debug: isDev ? debugInfo : undefined,
      };
    }

    // 4-2. ADMIN_EMAIL_ALLOWLIST에 포함
    const allowlist = getAdminEmailAllowlist();
    
    if (isDev) {
      debugInfo.allowlistCount = allowlist.length;
      debugInfo.emailInAllowlist = allowlist.includes(userEmail || "");
    }

    if (userEmail && allowlist.includes(userEmail)) {
      return {
        isAdmin: true,
        userId,
        email: userEmail,
        appRole: appMetadataRole,
        reason: "email_allowlist",
        authMethod,
        debug: isDev ? debugInfo : undefined,
      };
    }
    return {
      isAdmin: false,
      userId,
      email: userEmail,
      appRole: appMetadataRole,
      authMethod,
      error: "not_admin",
      debug: isDev ? debugInfo : undefined,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkAdminAuth] Error:", msg);
    return {
      isAdmin: false,
      error: msg,
      debug: isDev ? { ...debugInfo, exception: msg } : undefined,
    };
  }
}

/**
 * ✅ 관리자 권한 확인 (간단 버전)
 * 
 * @param request NextRequest (optional)
 * @returns boolean
 */
export async function isAdmin(request?: NextRequest): Promise<boolean> {
  const result = await checkAdminAuth(request);
  return result.isAdmin;
}
