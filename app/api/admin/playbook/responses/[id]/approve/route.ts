/**
 * HEALO: Admin Playbook — Approve Response
 *
 * POST /api/admin/playbook/responses/:id/approve
 * - status -> approved
 * - rag_documents upsert (source_type='playbook', trust_tier=2)
 * - rag_chunks 재생성
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../../../src/lib/auth/requireAdminAuth";
import { chunkText } from "../../../../../../../src/lib/rag/chunker";

const nowIso = () => new Date().toISOString();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();

  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  if (!id || id.length < 10) {
    return Response.json({ ok: false, error: "Invalid response id" }, { status: 400 });
  }

  try {
    const { data: resp, error: fetchErr } = await supabaseAdmin
      .from("coordinator_responses")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !resp) {
      return Response.json({ ok: false, error: "Response not found" }, { status: 404 });
    }

    if (resp.status === "approved") {
      return Response.json({ ok: false, error: "Already approved" }, { status: 409 });
    }

    const tagsLabel = resp.case_tags?.length > 0
      ? resp.case_tags.join(", ")
      : "General";
    const dateStr = new Date().toISOString().slice(0, 10);
    const docTitle = `Playbook: ${tagsLabel} - ${dateStr}`;

    let ragDocId = resp.rag_document_id;

    if (ragDocId) {
      const { error: updErr } = await supabaseAdmin
        .from("rag_documents")
        .update({
          title: docTitle,
          content: resp.response_text_sanitized,
          trust_tier: 2,
          source_label: "HEALO Coordinator Playbook",
          updated_at: nowIso(),
        })
        .eq("id", ragDocId);

      if (updErr) throw updErr;

      await supabaseAdmin.from("rag_chunks").delete().eq("document_id", ragDocId);
    } else {
      const { data: newDoc, error: insErr } = await supabaseAdmin
        .from("rag_documents")
        .insert({
          source_type: "playbook",
          source_id: id,
          lang: resp.language || "en",
          title: docTitle,
          content: resp.response_text_sanitized,
          version: 1,
          trust_tier: 2,
          source_label: "HEALO Coordinator Playbook",
          created_at: nowIso(),
          updated_at: nowIso(),
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      ragDocId = newDoc.id;
    }

    const chunks = chunkText(resp.response_text_sanitized);
    if (chunks.length > 0) {
      const payload = chunks.map((chunk: { index: number; content: string }) => ({
        document_id: ragDocId,
        chunk_index: chunk.index,
        content: chunk.content,
        metadata: {
          source_type: "playbook",
          source_id: id,
          lang: resp.language || "en",
          title: docTitle,
          version: 1,
        },
      }));
      const { error: chunkErr } = await supabaseAdmin.from("rag_chunks").insert(payload);
      if (chunkErr) throw chunkErr;
    }

    const { data: updated, error: approveErr } = await supabaseAdmin
      .from("coordinator_responses")
      .update({
        status: "approved",
        approved_at: nowIso(),
        approved_by: auth.authResult.userId || null,
        rag_document_id: ragDocId,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (approveErr) throw approveErr;

    return Response.json({
      ok: true,
      response: updated,
      rag_document_id: ragDocId,
      chunks_created: chunks.length,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/playbook/responses/:id/approve]", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
