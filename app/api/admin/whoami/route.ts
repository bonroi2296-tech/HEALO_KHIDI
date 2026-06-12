/**
 * HEALO: 관리자 진단 엔드포인트
 * 
 * 경로: /api/admin/whoami
 * 권한: 관리자 전용 (운영 환경) / 개발 환경에서는 인증 없이 진단 가능
 * Rate Limit: 적용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    const auth = await requireAdminAuth(request);
    if (!auth.success) return auth.response;

    return Response.json({
      isAdmin: true,
      email: auth.authResult.email || null,
      userId: auth.authResult.userId || null,
    });
  }

  const authResult = await checkAdminAuth(request);

  return Response.json({
    isAdmin: authResult.isAdmin,
    email: authResult.email || null,
    userId: authResult.userId || null,
    reason: authResult.reason || null,
    error: authResult.error || null,
    debug: {
      ...(authResult.debug || {}),
      url: request.url,
      method: request.method,
      envVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasAdminAllowlist: !!process.env.ADMIN_EMAIL_ALLOWLIST,
        allowlistCount: (process.env.ADMIN_EMAIL_ALLOWLIST || "").split(",").filter(Boolean).length,
      },
    },
  });
}
