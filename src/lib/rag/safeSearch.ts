/**
 * HEALO: RAG 검색 — RPC 전용, 무필터 fallback 금지
 *
 * 모든 RAG 검색은 rag_search_chunks_v1_1 RPC만 사용.
 * 임베딩 실패 또는 RPC 실패 시 빈 배열 반환 (안전 모드).
 * 직접 rag_documents/rag_chunks 조회 또는 ILIKE fallback 금지.
 * RAG_DISABLED=true 시 embedding/RPC 없이 [] 반환, rag_query_events에 1건 기록(detail.reason=disabled).
 */

import "server-only";

import { createHash } from "crypto";
import { supabaseAdmin } from "./supabaseAdmin";
import { getEmbedding } from "../chat/generateReply";
import { hashQuery, logRagDisabled } from "./ragQueryEvents";

function computeThreadHash(threadId: string): number {
  const hash = createHash("sha256").update(threadId).digest();
  return (hash[0] | (hash[1] << 8)) % 100;
}

export type SafeRagSearchParams = {
  query: string;
  lang: string;
  threadId?: string | null;
  matchCount?: number;
  pSourceType?: string | null;
  partnerOnly?: boolean;
  /** 이벤트 로깅용 (RAG_DISABLED 시). 기본 'api' */
  source?: string;
};

export type SafeRagChunk = {
  chunk_id?: string;
  document_id?: string;
  chunk_index?: number;
  content: string;
  trust_tier: number;
  source_label: string | null;
  doc_title: string | null;
  doc_source_type: string | null;
  doc_source_id: string | null;
  similarity_score?: number;
  rag_documents?: { source_type: string | null; title: string | null };
};

/**
 * RAG 검색 — rag_search_chunks_v1_1 RPC만 사용.
 * 실패 시 [] 반환. 직접 쿼리/ILIKE 사용 안 함.
 */
export async function safeRagSearch(params: SafeRagSearchParams): Promise<SafeRagChunk[]> {
  const {
    query,
    lang,
    threadId = null,
    matchCount = 6,
    pSourceType = null,
    partnerOnly = false,
    source = "api",
  } = params;

  if (process.env.RAG_DISABLED === "true") {
    await logRagDisabled({
      source,
      queryTextHash: hashQuery(query),
      lang: lang || null,
    });
    return [];
  }

  const embedding = await getEmbedding(query);
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    console.error("[safeRagSearch] Embedding failed or empty, returning no chunks");
    return [];
  }

  const abEnabled = !!threadId;
  const threadHash = threadId ? computeThreadHash(threadId) : 0;

  const { data, error } = await supabaseAdmin.rpc("rag_search_chunks_v1_1", {
    query_embedding: JSON.stringify(embedding),
    match_count: matchCount,
    p_lang: lang || undefined,
    p_source_type: pSourceType ?? undefined,
    p_partner_only: partnerOnly,
    p_ab_enabled: abEnabled,
    p_thread_hash: threadHash,
  });

  if (error) {
    console.error("[safeRagSearch] RPC error:", error.message);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: any) => ({
    chunk_id: row.chunk_id ?? undefined,
    document_id: row.document_id ?? undefined,
    chunk_index: row.chunk_index ?? undefined,
    content: row.content ?? "",
    trust_tier: row.trust_tier ?? 3,
    source_label: row.source_label ?? null,
    doc_title: row.doc_title ?? null,
    doc_source_type: row.doc_source_type ?? null,
    doc_source_id: row.doc_source_id ?? null,
    similarity_score: row.similarity_score ?? undefined,
    rag_documents: {
      source_type: row.doc_source_type ?? null,
      title: row.doc_title ?? null,
    },
  }));
}
