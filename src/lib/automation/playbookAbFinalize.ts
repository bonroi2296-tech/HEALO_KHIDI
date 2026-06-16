/**
 * healwith AUTO-IMPROVEMENT: AB Test Finalize Worker
 *
 * AB testing 중인 패턴 비교 → 승격 또는 퇴출
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";

const MIN_DAYS = 7;
const MIN_USES = 50;
const IMPROVEMENT_THRESHOLD = 0.10;
const nowIso = () => new Date().toISOString();

interface BucketStats {
  total: number;
  used: number;
  handoff: number;
  fallback: number;
  used_rate: number;
  handoff_rate: number;
  fallback_rate: number;
}

function emptyStats(): BucketStats {
  return { total: 0, used: 0, handoff: 0, fallback: 0, used_rate: 0, handoff_rate: 0, fallback_rate: 0 };
}

function computeRates(s: BucketStats): BucketStats {
  s.used_rate = s.total > 0 ? s.used / s.total : 0;
  s.handoff_rate = s.total > 0 ? s.handoff / s.total : 0;
  s.fallback_rate = s.total > 0 ? s.fallback / s.total : 0;
  return s;
}

type VariantWithParent = Record<string, any> & {
  id: string;
  last_auto_action_at?: string | null;
  rag_document_id?: string | null;
  parent?: (Record<string, any> & { id: string; rag_document_id?: string | null }) | null;
};

export async function runAbFinalize(jobId: string): Promise<{ evaluated: number; promoted: number; variant_retired: number }> {
  // Supabase embed — 동일 테이블 self-join 은 TypeScript 추론이 실패해 any 로 캐스트.
  // 런타임 동작은 정상.
  const { data: variantsRaw } = await supabaseAdmin
    .from("playbook_patterns")
    .select("*, parent:auto_parent_id(*)")
    .eq("auto_status", "ab_testing")
    .eq("ab_bucket", "variant")
    .eq("is_active", true);

  const variants = (variantsRaw as unknown as VariantWithParent[]) || [];

  let evaluated = 0, promoted = 0, variantRetired = 0;

  for (const variant of variants) {
    const parent = variant.parent;
    if (!parent) continue;

    const abStarted = variant.last_auto_action_at;
    if (!abStarted) continue;

    const daysSince = (Date.now() - new Date(abStarted).getTime()) / 86400000;

    const sinceDate = new Date(abStarted).toISOString();
    const { data: events } = await supabaseAdmin
      .from("playbook_usage_events")
      .select("retrieved_pattern_ids, used, used_pattern_id, handoff_requested, metadata")
      .gte("created_at", sinceDate);

    const variantStats = emptyStats();
    const controlStats = emptyStats();

    for (const ev of events || []) {
      const pids = (ev as any).retrieved_pattern_ids || [];
      const meta = (ev as any).metadata as Record<string, any> | null | undefined;
      const hasVariant = pids.includes(variant.id);
      const hasControl = pids.includes(parent.id);

      if (hasVariant) {
        variantStats.total++;
        if ((ev as any).used && (ev as any).used_pattern_id === variant.id) variantStats.used++;
        if ((ev as any).handoff_requested) variantStats.handoff++;
        if (meta?.analytics_fallback) variantStats.fallback++;
      }
      if (hasControl) {
        controlStats.total++;
        if ((ev as any).used && (ev as any).used_pattern_id === parent.id) controlStats.used++;
        if ((ev as any).handoff_requested) controlStats.handoff++;
        if (meta?.analytics_fallback) controlStats.fallback++;
      }
    }

    computeRates(variantStats);
    computeRates(controlStats);

    const totalUses = variantStats.total + controlStats.total;
    const readyByTime = daysSince >= MIN_DAYS;
    const readyByVolume = totalUses >= MIN_USES;

    if (!readyByTime && !readyByVolume) continue;

    evaluated++;

    const usedImproved = variantStats.used_rate >= controlStats.used_rate + IMPROVEMENT_THRESHOLD;
    const handoffNotWorse = variantStats.handoff_rate <= controlStats.handoff_rate + 0.02;
    const fallbackNotWorse = variantStats.fallback_rate <= controlStats.fallback_rate + 0.02;
    const variantWins = usedImproved && handoffNotWorse && fallbackNotWorse;

    if (variantWins) {
      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "promoted", ab_bucket: null, traffic_split: 0,
        canonical_id: null, last_auto_action_at: nowIso(), updated_at: nowIso(),
      }).eq("id", variant.id);

      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "auto_retired", is_active: false, ab_bucket: null, traffic_split: 0,
        last_auto_action_at: nowIso(), updated_at: nowIso(),
      }).eq("id", parent.id);

      if (parent.rag_document_id) {
        await supabaseAdmin.from("rag_documents").update({
          trust_tier: 3, source_label: "healwith Playbook (Auto-Retired)", updated_at: nowIso(),
        }).eq("id", parent.rag_document_id);
      }

      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId,
        event_type: "ab_finalize.variant_promoted",
        step: "ab_finalize",
        data: {
          pattern_id: variant.id,
          parent_id: parent.id,
          days: Math.round(daysSince),
          total_uses: totalUses,
          variant: variantStats as unknown as Record<string, number>,
          control: controlStats as unknown as Record<string, number>,
        } as any,
      });
      promoted++;
    } else {
      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "auto_retired", is_active: false, ab_bucket: null, traffic_split: 0,
        last_auto_action_at: nowIso(), updated_at: nowIso(),
      }).eq("id", variant.id);

      if (variant.rag_document_id) {
        await supabaseAdmin.from("rag_documents").update({
          trust_tier: 3, source_label: "healwith Playbook (AB-Failed)", updated_at: nowIso(),
        }).eq("id", variant.rag_document_id);
      }

      await supabaseAdmin.from("playbook_patterns").update({
        auto_status: "none", ab_bucket: null, traffic_split: 0,
        last_auto_action_at: nowIso(), updated_at: nowIso(),
      }).eq("id", parent.id);

      await supabaseAdmin.from("auto_job_events").insert({
        job_id: jobId,
        event_type: "ab_finalize.variant_retired",
        step: "ab_finalize",
        data: {
          pattern_id: variant.id,
          parent_id: parent.id,
          days: Math.round(daysSince),
          total_uses: totalUses,
          variant: variantStats as unknown as Record<string, number>,
          control: controlStats as unknown as Record<string, number>,
        } as any,
      });
      variantRetired++;
    }
  }

  return { evaluated, promoted, variant_retired: variantRetired };
}
