/**
 * healwith: 관리자 권한 강제 체크 유틸
 * 
 * 목적:
 * - 모든 admin API에서 일관된 권한 체크
 * - 실패 시 자동으로 audit log 기록 (UNAUTHORIZED_ADMIN_ACCESS)
 * - 403 응답 자동 반환
 * 
 * 사용법:
 * ```ts
 * const auth = await requireAdminAuth(request);
 * if (!auth.success) {
 *   return auth.response; // 403 + audit log 자동 처리됨
 * }
 * const { authResult } = auth;
 * ```
 */

import { NextRequest } from "next/server";
import { checkAdminAuth } from "./checkAdminAuth";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "../audit/adminAuditLog";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "../rateLimit";

/**
 * ✅ 관리자 권한 강제 체크 + rate limit + 실패 시 audit log + 403/429 응답
 * 
 * @param request NextRequest
 * @param options { skipRateLimit?: boolean } - rate limit 체크 건너뛰기 (예: whoami)
 * @returns 성공 시 { success: true, authResult }, 실패 시 { success: false, response }
 */
export async function requireAdminAuth(
  request: NextRequest,
  options?: { skipRateLimit?: boolean }
): Promise<
  | { success: true; authResult: Awaited<ReturnType<typeof checkAdminAuth>> }
  | { success: false; response: Response }
> {
  // ========================================
  // 1. Rate Limit 체크 (옵션)
  // ========================================
  if (!options?.skipRateLimit) {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.ADMIN);
    
    if (!rateLimitResult.allowed) {
      const pathname = new URL(request.url).pathname;
      const resetIn = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      
      console.warn(
        `[requireAdminAuth] ❌ Rate limit exceeded: ${pathname} | IP: ${clientIp} | Reset in ${resetIn}s`
      );
      
      return {
        success: false,
        response: Response.json(
          {
            ok: false,
            error: "rate_limited",
            detail: `Too many requests. Please try again in ${resetIn} seconds.`,
            retryAfter: resetIn,
          },
          {
            status: 429,
            headers: {
              "Retry-After": resetIn.toString(),
              "X-RateLimit-Limit": RATE_LIMITS.ADMIN.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
            },
          }
        ),
      };
    }
  }
  
  // ========================================
  // 2. Admin 권한 체크
  // ========================================
  const authResult = await checkAdminAuth(request);

  if (!authResult.isAdmin) {
    const pathname = new URL(request.url).pathname;
    // 프로덕션에서도 403 원인 한 줄 로그 (Vercel 로그에서 확인 가능)
    console.warn(
      `[requireAdminAuth] 403 path=${pathname} reason=${authResult.error || "not_admin"} email=${authResult.email || "none"}`
    );

    // 백그라운드로 audit log 기록 (메인 로직 블로킹 방지)
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "UNAUTHORIZED_ADMIN_ACCESS",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        error: authResult.error,
        reason: authResult.reason,
        path: pathname,
        method: request.method,
      },
    }).catch((err) => {
      console.error("[requireAdminAuth] Audit log failed:", err.message);
    });

    // 403 응답 반환 (운영에서도 힌트 제공: Vercel env / Supabase role)
    const response: Record<string, unknown> = {
      ok: false,
      error: "unauthorized",
      detail: "관리자 권한이 필요합니다",
      hint: "Vercel: ADMIN_EMAIL_ALLOWLIST 설정. Supabase: 사용자 app_metadata.role = admin",
    };

    if (process.env.NODE_ENV !== "production" && authResult.debug) {
      response.debug = authResult.debug;
    }

    return {
      success: false,
      response: Response.json(response, { status: 403 }),
    };
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[requireAdminAuth] Granted: ${authResult.email}`);
  }

  return { success: true, authResult };
}
