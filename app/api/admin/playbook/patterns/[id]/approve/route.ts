/**
 * healwith: Approve Playbook Pattern → RAG Document + Embedding 자동 생성
 *
 * POST /api/admin/playbook/patterns/:id/approve
 * - 승인 → rag_documents upsert → rag_chunks + embedding insert
 * - embedding 실패 시 전체 롤백 (pattern은 draft로 유지)
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { chunkText } from "@/lib/rag/chunker";
import { getEmbedding } from "@/lib/chat/generateReply";

const nowIso = () => new Date().toISOString();
const EMBEDDING_MODEL = "gemini-embedding-001";

async function generateEmbedding(text: string): Promise<number[]> {
  const vec = await getEmbedding(text);
  if (!vec || vec.length === 0) {
    throw new Error("Embedding generation failed — check GOOGLE_GENERATIVE_AI_API_KEY");
  }
  return vec;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  let createdDocId: string | null = null;
  let createdChunkIds: string[] = [];
  let wasExistingDoc = false;
  let previousDocState: any = null;

  try {
    const { data: pattern, error: pErr } = await supabaseAdmin
      .from("playbook_patterns")
      .select("*")
      .eq("id", id)
      .single();

    if (pErr || !pattern) {
      return Response.json({ ok: false, error: "Pattern not found" }, { status: 404 });
    }

    if (pattern.status === "approved") {
      return Response.json({ ok: false, error: "Already approved" }, { status: 409 });
    }

    if (pattern.is_active === false) {
      return Response.json({ ok: false, error: "Pattern is retired" }, { status: 400 });
    }

    // --- Quality gate ---
    const gateErrors: string[] = [];
    if ((pattern.quality_score ?? 0) < 70) gateErrors.push(`quality_score ${pattern.quality_score} < 70`);
    if (!pattern.safety_notes?.length) gateErrors.push("safety_notes is empty");
    if ((pattern.response_template?.length ?? 0) > 2000) gateErrors.push(`response_template length ${pattern.response_template.length} > 2000`);
    if (!pattern.user_intent?.trim()) gateErrors.push("user_intent is empty");
    if (!pattern.trigger || Object.keys(pattern.trigger).length === 0) gateErrors.push("trigger is empty");

    if (gateErrors.length > 0) {
      const rejectReason = gateErrors.join("; ");
      await supabaseAdmin
        .from("playbook_patterns")
        .update({
          reject_reason: rejectReason,
          quality_gate: { passed: false, errors: gateErrors, checked_at: nowIso() },
          updated_at: nowIso(),
        })
        .eq("id", id);
      return Response.json({ ok: false, error: "Quality gate failed", gate_errors: gateErrors, reject_reason: rejectReason }, { status: 400 });
    }

    await supabaseAdmin
      .from("playbook_patterns")
      .update({
        reject_reason: null,
        quality_gate: { passed: true, errors: [], checked_at: nowIso() },
      })
      .eq("id", id);

    const title = `Playbook: ${pattern.treatment_slug || pattern.scope} | ${pattern.user_intent.slice(0, 80)}`;

    const docContent = [
      pattern.response_template,
      "",
      "Key questions:",
      ...pattern.key_questions.map((q: string) => `- ${q}`),
      "",
      "Safety notes:",
      ...pattern.safety_notes.map((n: string) => `- ${n}`),
    ].join("\n");

    // --- Step 1: rag_documents upsert (ingest_status='pending') ---
    let ragDocId = pattern.rag_document_id;

    if (ragDocId) {
      wasExistingDoc = true;
      const { data: prev } = await supabaseAdmin
        .from("rag_documents")
        .select("*")
        .eq("id", ragDocId)
        .single();
      previousDocState = prev;

      const { error: docUpErr } = await supabaseAdmin
        .from("rag_documents")
        .update({
          title,
          content: docContent,
          trust_tier: 2,
          source_label: "healwith Playbook (Approved)",
          metadata: { ...(previousDocState?.metadata || {}), ingest_status: "pending" },
          updated_at: nowIso(),
        })
        .eq("id", ragDocId);
      if (docUpErr) throw docUpErr;

      await supabaseAdmin.from("rag_chunks").delete().eq("document_id", ragDocId);
    } else {
      const { data: newDoc, error: docErr } = await supabaseAdmin
        .from("rag_documents")
        .insert({
          source_type: "playbook_pattern",
          source_id: id,
          lang: pattern.language,
          title,
          content: docContent,
          version: 1,
          trust_tier: 2,
          source_label: "healwith Playbook (Approved)",
          metadata: { ingest_status: "pending" },
          created_at: nowIso(),
          updated_at: nowIso(),
        })
        .select("id")
        .single();

      if (docErr) throw docErr;
      ragDocId = newDoc.id;
      createdDocId = newDoc.id;
    }

    // --- Step 2: chunk + embedding 생성 ---
    const chunks = chunkText(docContent);
    if (chunks.length > 0) {
      const embeddingResults: number[][] = [];
      for (const chunk of chunks) {
        const vec = await generateEmbedding(chunk.content);
        embeddingResults.push(vec);
      }

      const payload = chunks.map((chunk: { index: number; content: string }, i: number) => ({
        document_id: ragDocId,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: JSON.stringify(embeddingResults[i]),
        embedding_model: EMBEDDING_MODEL,
        embedded_at: nowIso(),
        metadata: {
          source_type: "playbook_pattern",
          source_id: id,
          lang: pattern.language,
          title,
          version: 1,
        },
      }));

      const { data: insertedChunks, error: chunkErr } = await supabaseAdmin
        .from("rag_chunks")
        .insert(payload)
        .select("id");
      if (chunkErr) throw chunkErr;
      createdChunkIds = (insertedChunks || []).map((c: any) => c.id);
    }

    // --- Step 3: ingest_status='done' ---
    await supabaseAdmin
      .from("rag_documents")
      .update({ metadata: { ...(previousDocState?.metadata || {}), ingest_status: "done" }, updated_at: nowIso() })
      .eq("id", ragDocId);

    // --- Step 4: pattern 상태 업데이트 ---
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("playbook_patterns")
      .update({
        status: "approved",
        approved_at: nowIso(),
        approved_by: auth.authResult.userId || null,
        rag_document_id: ragDocId,
        updated_at: nowIso(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updErr) throw updErr;

    return Response.json({
      ok: true,
      pattern: updated,
      rag_document_id: ragDocId,
      chunks_created: chunks.length,
      embeddings_generated: chunks.length,
      ingest_status: "done",
    });
  } catch (err: any) {
    console.error("[POST approve pattern] Error, rolling back:", err.message);

    // --- Mark ingest_status='failed' on the doc (if it exists) ---
    const failDocId = createdDocId || (wasExistingDoc ? previousDocState?.id : null);
    if (failDocId) {
      try {
        const { data: curDoc } = await supabaseAdmin
          .from("rag_documents")
          .select("metadata")
          .eq("id", failDocId)
          .single();
        await supabaseAdmin
          .from("rag_documents")
          .update({
            metadata: {
              ...((curDoc?.metadata && typeof curDoc.metadata === "object" && !Array.isArray(curDoc.metadata)) ? curDoc.metadata : {}),
              ingest_status: "failed",
              ingest_error: String(err.message).slice(0, 500),
              failed_at: nowIso(),
            },
          })
          .eq("id", failDocId);
      } catch (_) { /* best-effort */ }
    }

    // --- Rollback chunks ---
    try {
      if (createdChunkIds.length > 0) {
        await supabaseAdmin.from("rag_chunks").delete().in("id", createdChunkIds);
      }
      if (createdDocId) {
        await supabaseAdmin.from("rag_documents").delete().eq("id", createdDocId);
      } else if (wasExistingDoc && previousDocState) {
        await supabaseAdmin
          .from("rag_documents")
          .update({
            title: previousDocState.title,
            content: previousDocState.content,
            trust_tier: previousDocState.trust_tier,
            source_label: previousDocState.source_label,
            metadata: { ...(previousDocState.metadata || {}), ingest_status: "failed", ingest_error: String(err.message).slice(0, 500) },
            updated_at: previousDocState.updated_at,
          })
          .eq("id", previousDocState.id);
      }
    } catch (rbErr: any) {
      console.error("[POST approve pattern] Rollback failed:", rbErr.message);
    }

    const userMsg = err.message?.includes("Embedding")
      ? "Embedding 생성 실패 — GOOGLE_GENERATIVE_AI_API_KEY를 확인하세요"
      : "Internal server error";

    return Response.json({ ok: false, error: userMsg, ingest_status: "failed" }, { status: 500 });
  }
}
