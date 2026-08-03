/**
 * healwith: RAG 검색 — RPC 전용, 무필터 fallback 금지
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
import { hashQuery, logRagDisabled, insertRagQueryEvent } from "./ragQueryEvents";

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

  // 관측 기록(2026-07-31 연결). 이 파일 맨 위 주석과 ragQueryEvents.ts 는 「실패/0결과 운영 감지」를
  // 목적으로 적혀 있었는데, 정작 insertRagQueryEvent 를 **아무도 부르지 않아** 표가 0건이었다
  // (AI 채팅은 666건 돌았다). 아래 세 갈래는 전부 조용히 [] 를 돌려주고, 남는 건 console.error 뿐인데
  // 실행 기록은 1시간이면 사라진다 → **AI 가 근거를 하나도 못 찾고 답한 경우를 영영 알 수 없었다.**
  const startedAt = Date.now();
  const queryTextHash = hashQuery(query);

  const embedding = await getEmbedding(query);
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    console.error("[safeRagSearch] Embedding failed or empty, returning no chunks");
    await insertRagQueryEvent({
      source,
      threadId,
      queryTextHash,
      lang: lang || null,
      resultCount: 0,
      status: "embedding_failed",
      latencyMs: Date.now() - startedAt,
    });
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
    // detail 은 내부 운영 표라 원인 메시지를 남긴다(API 응답으로는 절대 안 나간다 — 보안 규칙).
    await insertRagQueryEvent({
      source,
      threadId,
      queryTextHash,
      lang: lang || null,
      resultCount: 0,
      status: "rpc_failed",
      latencyMs: Date.now() - startedAt,
      detail: { message: error.message },
    });
    return [];
  }

  const rows = !data || !Array.isArray(data) ? [] : data;

  // 0건도 반드시 남긴다 — 「검색은 성공했는데 근거가 없었다」가 환각이 나오는 자리다.
  await insertRagQueryEvent({
    source,
    threadId,
    queryTextHash,
    lang: lang || null,
    resultCount: rows.length,
    status: rows.length === 0 ? "zero_results" : "ok",
    latencyMs: Date.now() - startedAt,
  });

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row: any) => ({
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
