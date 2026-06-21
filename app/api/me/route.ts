/**
 * healwith: 현재 로그인 사용자의 계정 계층(role) 조회 — 포털 문지기용.
 *
 * GET /api/me
 *   → { ok, userId, email, isAdmin, appRole, isStaff }
 *
 * 용도: /coordinator·/doctor 등 스태프 포털이 "로그인 여부"뿐 아니라
 *       "역할(app_metadata.role)"까지 확인해 비스태프 접근을 차단하도록.
 * 권한 판정은 app_metadata.role 기준(checkAdminAuth) — user_metadata 신뢰 금지.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { STAFF_TIERS, type AccountTier } from "@/lib/auth/accountTiers";

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const appRole = auth.appRole ?? null;
  const isStaff =
    auth.isAdmin || (appRole ? STAFF_TIERS.includes(appRole as AccountTier) : false);
  return Response.json({
    ok: true,
    userId: auth.userId,
    email: auth.email ?? null,
    isAdmin: auth.isAdmin,
    appRole,
    isStaff,
  });
}
