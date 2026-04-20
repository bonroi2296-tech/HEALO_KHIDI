/**
 * HEALO: Retire Playbook Pattern
 *
 * POST /api/admin/playbook/patterns/:id/retire
 * - is_active=false, 연결된 rag_documents trust_tier=3 강등
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../../src/lib/auth/requireAdminAuth";

const nowIso = () => new Date().toISOString();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    let reason = "Manual retire";
    try {
      const body = await request.json();
      if (body?.reason) reason = String(body.reason).slice(0, 500);
    } catch { /* no body is fine */ }

    const { data: pattern, error: pErr } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id, is_active, rag_document_id, metadata")
      .eq("id", id)
      .single();

    if (pErr || !pattern) {
      return Response.json({ ok: false, error: "Pattern not found" }, { status: 404 });
    }

    if (!pattern.is_active) {
      return Response.json({ ok: false, error: "Already retired" }, { status: 409 });
    }

    const { error: updErr } = await supabaseAdmin
      .from("playbook_patterns")
      .update({
        is_active: false,
        updated_at: nowIso(),
        metadata: { ...((pattern.metadata && typeof pattern.metadata === "object" && !Array.isArray(pattern.metadata)) ? pattern.metadata : {}), retire_reason: reason, retired_at: nowIso(), retired_by: auth.authResult.email },
      })
      .eq("id", id);
    if (updErr) throw updErr;

    if (pattern.rag_document_id) {
      await supabaseAdmin
        .from("rag_documents")
        .update({ trust_tier: 3, source_label: "HEALO Playbook (Retired)", updated_at: nowIso() })
        .eq("id", pattern.rag_document_id);
    }

    return Response.json({ ok: true, retired: true });
  } catch (err: any) {
    console.error("[POST retire pattern]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
