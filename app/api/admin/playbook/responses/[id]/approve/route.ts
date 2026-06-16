/**
 * healwith: Admin Playbook — Approve Response
 *
 * POST /api/admin/playbook/responses/:id/approve
 * - status -> approved
 * - rag_documents upsert (source_type='playbook', trust_tier=2)
 * - rag_chunks 재생성
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { chunkText } from "@/lib/rag/chunker";

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
    const { data: respRaw, error: fetchErr } = await supabaseAdmin
      .from("coordinator_responses")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !respRaw) {
      return Response.json({ ok: false, error: "Response not found" }, { status: 404 });
    }

    // TODO(schema-drift): coordinator_responses 실제 스키마에는 case_tags /
    // rag_document_id / response_text_sanitized / language / approved_at /
    // approved_by 컬럼이 없음. 아래 코드가 런타임에 실패하는지 실사용 경로 확인 필요.
    // 단기 해결: metadata jsonb 로 옮기거나 마이그레이션으로 컬럼 복원.
    const resp = respRaw as any;

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
          source_label: "healwith Coordinator Playbook",
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
          source_label: "healwith Coordinator Playbook",
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
      // TODO(schema-drift): approved_at / approved_by / rag_document_id 컬럼 부재.
      // 현재는 any 로 캐스트 — 마이그레이션으로 컬럼 복원하거나 metadata 에 저장하도록 리팩터 필요.
      .update({
        status: "approved",
        approved_at: nowIso(),
        approved_by: auth.authResult.userId || null,
        rag_document_id: ragDocId,
      } as any)
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
