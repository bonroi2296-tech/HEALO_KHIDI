/**
 * healwith AUTO-IMPROVEMENT: Daily Evaluation Worker
 *
 * playbook_usage_events 최근 7일 집계 → per-pattern auto_score 산정 → candidate 마킹
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";

const WINDOW_DAYS = 7;
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

interface PatternStats {
  pattern_id: string;
  retrieved_any: number;
  used_count: number;
  used_rate: number;
  handoff_count: number;
  handoff_rate: number;
  fallback_count: number;
  fallback_rate: number;
  avg_latency: number;
}

function computeAutoScore(s: PatternStats): number {
  const latencyPenalty = s.avg_latency > 3000 ? 5 : 0;
  return clamp(0, 100, Math.round(
    s.used_rate * 50
    + Math.min(1, s.retrieved_any / 50) * 20
    - s.handoff_rate * 15
    - s.fallback_rate * 10
    - latencyPenalty
  ));
}

export async function runDailyEval(jobId: string): Promise<{ evaluated: number; candidates: number }> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();

  const { data: events, error: evErr } = await supabaseAdmin
    .from("playbook_usage_events")
    .select("retrieved_pattern_ids, used, used_pattern_id, handoff_requested, latency_ms, metadata")
    .gte("created_at", since);

  if (evErr) throw evErr;

  const statsMap = new Map<string, {
    retrieved: number; used: number; handoff: number;
    fallback: number; total: number; latencySum: number; latencyCount: number;
  }>();

  for (const ev of events || []) {
    for (const pid of (ev.retrieved_pattern_ids || [])) {
      let s = statsMap.get(pid);
      if (!s) {
        s = { retrieved: 0, used: 0, handoff: 0, fallback: 0, total: 0, latencySum: 0, latencyCount: 0 };
        statsMap.set(pid, s);
      }
      s.retrieved++;
      s.total++;
      if (ev.used && ev.used_pattern_id === pid) s.used++;
      if (ev.handoff_requested) s.handoff++;
      if ((ev.metadata as any)?.analytics_fallback === true) s.fallback++;
      if (ev.latency_ms != null) {
        s.latencySum += ev.latency_ms;
        s.latencyCount++;
      }
    }
  }

  const { data: activePatterns } = await supabaseAdmin
    .from("playbook_patterns")
    .select("id")
    .eq("is_active", true)
    .eq("status", "approved")
    .is("canonical_id", null);

  const patternIds = new Set((activePatterns || []).map((p: any) => p.id));
  const now = new Date().toISOString();
  let evaluated = 0;
  let candidates = 0;

  for (const pid of patternIds) {
    const raw = statsMap.get(pid);
    const stats: PatternStats = raw ? {
      pattern_id: pid,
      retrieved_any: raw.retrieved,
      used_count: raw.used,
      used_rate: raw.total > 0 ? raw.used / raw.total : 0,
      handoff_count: raw.handoff,
      handoff_rate: raw.total > 0 ? raw.handoff / raw.total : 0,
      fallback_count: raw.fallback,
      fallback_rate: raw.total > 0 ? raw.fallback / raw.total : 0,
      avg_latency: raw.latencyCount > 0 ? raw.latencySum / raw.latencyCount : 0,
    } : {
      pattern_id: pid, retrieved_any: 0, used_count: 0, used_rate: 0,
      handoff_count: 0, handoff_rate: 0, fallback_count: 0, fallback_rate: 0, avg_latency: 0,
    };

    const score = computeAutoScore(stats);
    let newAutoStatus: string;
    const gateFlags: Record<string, any> = {};

    if (score >= 85) {
      newAutoStatus = "none";
    } else if (score < 50) {
      newAutoStatus = "candidate";
      gateFlags.auto_retire_candidate = true;
    } else {
      newAutoStatus = "candidate";
    }

    await supabaseAdmin
      .from("playbook_patterns")
      .update({
        auto_score: score,
        auto_status: newAutoStatus,
        last_evaluated_at: now,
        quality_gate: gateFlags,
      } as any)
      .eq("id", pid);

    await supabaseAdmin.from("auto_job_events").insert({
      job_id: jobId,
      event_type: `daily_eval.${newAutoStatus}`,
      step: "daily_eval",
      data: { pattern_id: pid, score, stats, gate_flags: gateFlags } as any,
    });

    evaluated++;
    if (newAutoStatus === "candidate") candidates++;
  }

  return { evaluated, candidates };
}
