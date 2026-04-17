/**
 * GET /api/admin/observability/rag/health?window=7d
 *
 * RAG Health KPI: DB GROUP BY 집계만 사용 (대량 row fetch 금지).
 * window 기본 7d. 24h/1d/7d 지원.
 */
import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "../../../../../../src/lib/rag/supabaseAdmin";

const DEFAULT_WINDOW = "7d";
const ALERT_ZERO_RATE_THRESHOLD = 20;

function parseWindow(windowParam: string | null): { hours: number; label: string } {
  const w = (windowParam || DEFAULT_WINDOW).toLowerCase();
  if (w.endsWith("h")) {
    const h = parseInt(w.replace("h", ""), 10);
    const hours = Number.isFinite(h) ? h : 24 * 7;
    return { hours, label: `${hours}h` };
  }
  if (w.endsWith("d")) {
    const d = parseInt(w.replace("d", ""), 10);
    const hours = Number.isFinite(d) ? d * 24 : 24 * 7;
    return { hours, label: `${d}d` };
  }
  return { hours: 24 * 7, label: "7d" };
}

function toPct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const windowParam = searchParams.get("window");
    const { hours, label } = parseWindow(windowParam);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: agg, error } = await supabaseAdmin.rpc("rag_health_aggregates", {
      p_since: since,
    });

    if (error) {
      console.error("[observability/rag/health] RPC error:", error.message);
      return Response.json(
        { ok: false, error: "rpc_failed" },
        { status: 500 }
      );
    }

    if (!agg || typeof agg !== "object") {
      return Response.json(
        { ok: false, error: "invalid_aggregate_response" },
        { status: 500 }
      );
    }

    const total_requests = Number((agg as any).total_requests) || 0;
    const byStatus = (agg as any).by_status || {};
    const ok = Number(byStatus.ok) || 0;
    const zero_results = Number(byStatus.zero_results) || 0;
    const embedding_failed = Number(byStatus.embedding_failed) || 0;
    const rpc_failed = Number(byStatus.rpc_failed) || 0;

    const zero_rate = toPct(zero_results, total_requests);
    const embedding_fail_rate = toPct(embedding_failed, total_requests);
    const rpc_fail_rate = toPct(rpc_failed, total_requests);
    const alert = zero_rate > ALERT_ZERO_RATE_THRESHOLD;

    return Response.json({
      ok: true,
      window: label,
      since,
      total_requests,
      zero_rate,
      embedding_fail_rate,
      rpc_fail_rate,
      by_status: byStatus,
      lang_breakdown: (agg as any).lang_breakdown ?? [],
      source_breakdown: (agg as any).source_breakdown ?? [],
      top_5_sources_by_zero_rate: (agg as any).top_5_sources_by_zero_rate ?? [],
      daily_trend: (agg as any).daily_trend ?? [],
      alert,
    });
  } catch (e: any) {
    console.error("[observability/rag/health] error:", e?.message ?? e);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
