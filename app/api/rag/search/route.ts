/**
 * RAG Search API — rag_search_chunks_v1_1 RPC 전용
 *
 * 검색은 RPC만 사용. 임베딩 실패/짧은 쿼리/결과 없음 시 빈 결과 반환 (무필터 fallback 금지).
 */
export const runtime = "nodejs";

import { assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { safeRagSearch } from "../../../../src/lib/rag/safeSearch";

// ── 메인 핸들러 ─────────────────────────────────────────
export async function POST(request: Request) {
  assertSupabaseEnv();
  try {
    const body = await request.json();
    const query = String(body?.query || "").trim();
    const limit = Math.min(Math.max(Number(body?.limit || 10), 1), 30);
    const lang = body?.lang ? String(body.lang) : "en";
    const sourceTypes = Array.isArray(body?.sourceTypes)
      ? body.sourceTypes
      : null;
    const partnerOnly = body?.partnerOnly === true;

    if (!query) {
      return Response.json(
        { ok: false, error: "query_required" },
        { status: 400 }
      );
    }

    const pSourceType = sourceTypes?.[0] ?? null;
    const chunks = await safeRagSearch({
      query,
      lang: lang || "en",
      matchCount: limit,
      pSourceType,
      partnerOnly,
    });

    const results = chunks.map((c) => ({
      id: c.chunk_id ?? undefined,
      document_id: c.document_id ?? undefined,
      chunk_index: c.chunk_index ?? undefined,
      content: c.content,
      metadata: null,
      rag_documents: c.rag_documents
        ? {
            id: c.document_id ?? undefined,
            source_type: c.doc_source_type,
            source_id: c.doc_source_id,
            lang,
            title: c.doc_title,
          }
        : undefined,
      trust_tier: c.trust_tier,
      source_label: c.source_label,
      source_url: null,
      _score: c.similarity_score ?? 1,
    }));

    return Response.json({
      ok: true,
      results,
      scoring: chunks.length > 0 ? "vector_cosine_similarity" : null,
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "search_failed" },
      { status: 500 }
    );
  }
}
