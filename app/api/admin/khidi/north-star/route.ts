/**
 * healwith 북극성 지표(NSM) + 선행지표 API
 *
 * GET /api/admin/khidi/north-star?weeks=12
 *
 * 권한: admin only (requireAdminAuth)
 * 반환: 주간 사전상담 완료(북극성) 추세 + 선행지표 4종
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { getNorthStarMetrics } from "@/lib/khidi/northStar";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  let weeks = parseInt(searchParams.get("weeks") ?? "12", 10);
  if (isNaN(weeks) || weeks < 4) weeks = 12;
  if (weeks > 26) weeks = 26;

  try {
    const data = await getNorthStarMetrics(new Date(), weeks);
    return Response.json({ ok: true, ...data });
  } catch (err) {
    console.error("[api/admin/khidi/north-star] error:", (err as Error).message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
