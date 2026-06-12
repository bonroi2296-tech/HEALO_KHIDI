/**
 * HEALO: Merge Playbook Patterns
 *
 * POST /api/admin/playbook/patterns/merge
 * - canonical_id: 대표 패턴
 * - merge_ids: 병합 대상 패턴들 (canonical에 흡수)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

const nowIso = () => new Date().toISOString();

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { canonical_id, merge_ids } = await request.json();

    if (!canonical_id || !Array.isArray(merge_ids) || merge_ids.length === 0) {
      return Response.json({ ok: false, error: "canonical_id and merge_ids[] required" }, { status: 400 });
    }

    if (merge_ids.includes(canonical_id)) {
      return Response.json({ ok: false, error: "canonical_id cannot be in merge_ids" }, { status: 400 });
    }

    const { data: canonical, error: cErr } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id, is_active, status")
      .eq("id", canonical_id)
      .single();

    if (cErr || !canonical) {
      return Response.json({ ok: false, error: "Canonical pattern not found" }, { status: 404 });
    }

    if (!canonical.is_active) {
      return Response.json({ ok: false, error: "Canonical pattern is retired" }, { status: 400 });
    }

    const { data: targets, error: tErr } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id, rag_document_id")
      .in("id", merge_ids);

    if (tErr || !targets?.length) {
      return Response.json({ ok: false, error: "No valid merge targets found" }, { status: 404 });
    }

    const mergedIds: string[] = [];
    for (const target of targets) {
      if (target.id === canonical_id) continue;

      const { error: mErr } = await supabaseAdmin
        .from("playbook_patterns")
        .update({
          canonical_id,
          is_active: false,
          merged_at: nowIso(),
          merged_by: auth.authResult.userId || null,
          updated_at: nowIso(),
        })
        .eq("id", target.id);

      if (mErr) {
        console.error(`[merge] Failed to merge ${target.id}:`, mErr.message);
        continue;
      }

      if (target.rag_document_id) {
        await supabaseAdmin
          .from("rag_documents")
          .update({ trust_tier: 3, source_label: "HEALO Playbook (Merged)", updated_at: nowIso() })
          .eq("id", target.rag_document_id);
      }

      mergedIds.push(target.id);
    }

    return Response.json({
      ok: true,
      canonical_id,
      merged_count: mergedIds.length,
      merged_ids: mergedIds,
    });
  } catch (err: any) {
    console.error("[POST merge patterns]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
