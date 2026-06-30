/**
 * healwith 외부 서비스 사용량 API
 *
 * GET /api/admin/usage
 *
 * 권한: admin only (requireAdminAuth)
 * 반환: 모든 연동 서비스의 사용량 보드(실측/프록시/콘솔) — getServiceUsageBoard.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { getServiceUsageBoard } from "@/lib/admin/serviceUsage";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const board = await getServiceUsageBoard(new Date());
    return Response.json({ ok: true, ...board });
  } catch (err) {
    console.error("[api/admin/usage] error:", (err as Error).message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
