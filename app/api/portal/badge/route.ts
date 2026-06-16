/**
 * healwith: 알림 배지 카운트 — 로그인 사용자 본인 기준
 *
 * GET /api/portal/badge → { count } = 열린 스레드 + 오늘 예정 상담
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requirePortalAuth(request);
  if (!auth.success) return auth.response;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [threadsRes, consRes] = await Promise.all([
      supabaseAdmin
        .from("chat_threads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.userId)
        .eq("status", "open"),
      supabaseAdmin
        .from("consultation_sessions")
        .select("id", { count: "exact", head: true })
        .eq("patient_user_id", auth.userId)
        .eq("status", "scheduled")
        .gte("scheduled_at", `${today}T00:00:00Z`)
        .lte("scheduled_at", `${today}T23:59:59Z`),
    ]);

    const count = (threadsRes.count || 0) + (consRes.count || 0);
    return Response.json({ ok: true, count });
  } catch (err: any) {
    console.error("[portal/badge] error:", err.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
