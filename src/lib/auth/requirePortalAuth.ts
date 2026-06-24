/**
 * healwith: 포털(환자·코디네이터) API 인증 헬퍼
 *
 * 배경: inquiries / chat_threads / chat_messages / consultation_sessions 는
 * RLS상 service_role 전용 → 브라우저 client 직접 쿼리는 항상 빈 데이터.
 * 포털 데이터 조회는 반드시 이 헬퍼로 인증 후 서버에서 service_role 로 처리.
 *
 * 역할 판정:
 * - isAdmin: app_metadata.role === "admin" 또는 ADMIN_EMAIL_ALLOWLIST
 * - isStaff: isAdmin 또는 app_metadata.role === "coordinator"
 *   (역할 부여는 /admin/staff 에서 service_role 로만 가능 — user_metadata 사용 금지)
 */

import "server-only";
import { NextRequest } from "next/server";
import { checkAdminAuth } from "./checkAdminAuth";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "../rateLimit";

const PORTAL_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 120, // 메시지 폴링 포함이라 관대하게
  apiName: "portal_api",
};

const STAFF_ROLES = ["admin", "coordinator"];

export type PortalAuthResult =
  | {
      success: true;
      userId: string;
      email?: string;
      isAdmin: boolean;
      isStaff: boolean;
      appRole?: string;
    }
  | { success: false; response: Response };

export async function requirePortalAuth(
  request: NextRequest,
  options?: { staffOnly?: boolean }
): Promise<PortalAuthResult> {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, PORTAL_RATE);
  if (!rl.allowed) {
    return {
      success: false,
      response: Response.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      ),
    };
  }

  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return {
      success: false,
      response: Response.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    };
  }

  const isStaff =
    auth.isAdmin || (auth.appRole ? STAFF_ROLES.includes(auth.appRole) : false);

  if (options?.staffOnly && !isStaff) {
    return {
      success: false,
      response: Response.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    success: true,
    userId: auth.userId,
    email: auth.email,
    isAdmin: auth.isAdmin,
    isStaff,
    appRole: auth.appRole,
  };
}
