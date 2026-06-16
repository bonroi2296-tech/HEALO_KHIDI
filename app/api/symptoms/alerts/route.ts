/**
 * healwith: symptom_alerts CRUD API (FR-16)
 *
 * GET  /api/symptoms/alerts — 코디네이터: 미확인 알림 목록
 * POST /api/symptoms/alerts — 코디네이터: acknowledge / resolve
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkAdminAuth } from "@/lib/auth/checkAdminAuth";
import { getSupabaseServerClient } from "@/lib/data/supabaseServerClient";

/**
 * GET — 알림 목록 조회 (코디네이터 전용)
 * query: ?status=unresolved|all, severity=critical|high|medium|low, limit=50, offset=0
 */
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "unresolved";
    const severity = searchParams.get("severity");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = (supabase as any)
      .from("symptom_alerts")
      .select("*", { count: "exact" })
      .order("detected_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "unresolved") {
      query = query.is("resolved_at", null);
    } else if (status === "unacknowledged") {
      query = query.is("acknowledged_at", null).is("resolved_at", null);
    }

    if (severity) {
      query = query.eq("severity" as any, severity);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[api/symptoms/alerts] GET error:", error);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return Response.json({ ok: true, data: data || [], total: count, limit, offset });
  } catch (e: any) {
    console.error("[api/symptoms/alerts] GET exception:", e);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

/**
 * POST — acknowledge 또는 resolve 처리
 * body: { alert_id, action: "acknowledge"|"resolve", resolution_note? }
 */
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (!auth.userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { alert_id, action, resolution_note } = body;

    if (!alert_id || !action) {
      return Response.json(
        { ok: false, error: "alert_id and action are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    if (action === "acknowledge") {
      const { error } = await (supabase as any)
        .from("symptom_alerts")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: auth.userId,
        })
        .eq("id", alert_id);

      if (error) {
        console.error("[api/symptoms/alerts] acknowledge error:", error);
        return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
      }

      return Response.json({ ok: true, action: "acknowledged" });
    }

    if (action === "resolve") {
      const { error } = await (supabase as any)
        .from("symptom_alerts")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_note: resolution_note || null,
          // 미확인 상태라면 같이 확인 처리
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: auth.userId,
        })
        .eq("id", alert_id);

      if (error) {
        console.error("[api/symptoms/alerts] resolve error:", error);
        return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
      }

      return Response.json({ ok: true, action: "resolved" });
    }

    return Response.json(
      { ok: false, error: "unknown action. use 'acknowledge' or 'resolve'" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[api/symptoms/alerts] POST exception:", e);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
