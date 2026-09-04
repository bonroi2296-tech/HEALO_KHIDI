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

    // ⚠️ 「나 관리자인가?」를 묻는 통로는 감사기록에 남기지 않는다 (2026-07-31).
    //    로그인 화면이 로그인 직후 /api/admin/whoami 를 **모두에게** 물어 역할을 가른다
    //    (app/login/LoginClient.jsx). 그래서 코디·에이전시가 정상 로그인할 때마다
    //    「무단 접근」이 한 줄씩 쌓였다 — 실측 48시간 19건 전부 이것이었고, 그중 진짜 침입은 0건.
    //    잡음이 쌓이면 **진짜 침입 신호가 그 안에 묻힌다.** 권한 차단(403)은 그대로다 — 기록만 뺀다.
    const isRoleProbe = pathname === "/api/admin/whoami";

    // 백그라운드로 audit log 기록 (메인 로직 블로킹 방지)
    if (!isRoleProbe) logAdminAction({
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

    // 403 응답 — 밖으로는 «코드형»만 낸다.
    //
    // 🛑 예전엔 운영에서도 hint 로 «Vercel: ADMIN_EMAIL_ALLOWLIST 설정. Supabase:
    //    app_metadata.role = admin» 을 내보냈다. 편의로 넣은 것인데, 이 헬퍼를 쓰는
    //    라우트가 82개라 **미인증자가 아무 admin API 만 찔러도** 호스팅(Vercel)·
    //    인증 백엔드(Supabase)·«권한을 정하는 환경변수 이름»·«판정 필드»까지 다 알 수 있었다
    //    (2026-09-05 실서비스 실측으로 확인). 공격자에겐 어디를 노릴지 알려주는 정찰 정보다.
    //    설정 방법은 사람이 코드·문서에서 보면 되지, 401/403 응답이 알려줄 일이 아니다.
    //    (CLAUDE.md 보안 규칙: API 응답에 내부 정보 금지 — 코드형만.)
    // hint 는 개발 환경에서만 남긴다. 아래 debug 와 같은 취급.
    const response: Record<string, unknown> = {
      ok: false,
      error: "unauthorized",
      detail: "관리자 권한이 필요합니다",
    };

    if (process.env.NODE_ENV !== "production") {
      response.hint =
        "Vercel: ADMIN_EMAIL_ALLOWLIST 설정. Supabase: 사용자 app_metadata.role = admin";
      if (authResult.debug) response.debug = authResult.debug;
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
