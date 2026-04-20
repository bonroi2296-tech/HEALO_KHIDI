/**
 * HEALO: Playbook Analytics API
 *
 * GET /api/admin/playbook/analytics
 * - summary: total, retrieved_any, used_count, used_rate, avg_latency_ms, handoff_rate
 * - top_patterns: pattern_id별 uses/retrieves
 * - timeseries(day): date별 total/used/retrieved_any/handoff
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const lang = url.searchParams.get("lang");
    const usedFilter = url.searchParams.get("used");
    const minRetrieved = Number(url.searchParams.get("min_retrieved")) || 0;

    let query = supabaseAdmin.from("playbook_usage_events").select("*");

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (lang) query = query.eq("language", lang);
    if (usedFilter === "true") query = query.eq("used", true);
    if (usedFilter === "false") query = query.eq("used", false);
    if (minRetrieved > 0) query = query.gte("retrieved_count", minRetrieved);

    query = query.order("created_at", { ascending: false }).limit(5000);

    const { data: rows, error } = await query;
    if (error) throw error;

    const events = rows || [];
    const total = events.length;
    const retrievedAny = events.filter((e) => e.retrieved_count > 0).length;
    const usedCount = events.filter((e) => e.used).length;
    const usedRate = total > 0 ? Math.round((usedCount / total) * 10000) / 100 : 0;
    const handoffCount = events.filter((e) => e.handoff_requested).length;
    const handoffRate = total > 0 ? Math.round((handoffCount / total) * 10000) / 100 : 0;
    const fallbackCount = events.filter((e) => (e.metadata as any)?.analytics_fallback === true).length;
    const fallbackRate = total > 0 ? Math.round((fallbackCount / total) * 10000) / 100 : 0;
    const latencies: number[] = events.filter((e) => e.latency_ms != null).map((e) => e.latency_ms as number);
    const avgLatencyMs = latencies.length > 0
      ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
      : 0;

    const patternMap = new Map<string, { uses: number; retrieves: number }>();
    for (const e of events) {
      for (const pid of (e.retrieved_pattern_ids || [])) {
        const cur = patternMap.get(pid) || { uses: 0, retrieves: 0 };
        cur.retrieves++;
        if (e.used && e.used_pattern_id === pid) cur.uses++;
        patternMap.set(pid, cur);
      }
    }
    const topPatterns = Array.from(patternMap.entries())
      .map(([pattern_id, stats]) => ({ pattern_id, ...stats }))
      .sort((a, b) => b.uses - a.uses || b.retrieves - a.retrieves)
      .slice(0, 20);

    const dayMap = new Map<string, { total: number; used: number; retrieved_any: number; handoff: number }>();
    for (const e of events) {
      const date = e.created_at.slice(0, 10);
      const cur = dayMap.get(date) || { total: 0, used: 0, retrieved_any: 0, handoff: 0 };
      cur.total++;
      if (e.used) cur.used++;
      if (e.retrieved_count > 0) cur.retrieved_any++;
      if (e.handoff_requested) cur.handoff++;
      dayMap.set(date, cur);
    }
    const timeseries = Array.from(dayMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Response.json({
      ok: true,
      summary: { total, retrieved_any: retrievedAny, used_count: usedCount, used_rate: usedRate, avg_latency_ms: avgLatencyMs, handoff_rate: handoffRate, fallback_count: fallbackCount, fallback_rate: fallbackRate },
      top_patterns: topPatterns,
      timeseries,
    });
  } catch (err: any) {
    console.error("[GET playbook/analytics]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
