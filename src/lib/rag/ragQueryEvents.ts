/**
 * RAG 관측성: rag_query_events 기록 (실패/0결과 운영 감지)
 * PII 금지: query 원문 저장하지 않음. query_text_hash(SHA256)만 저장.
 */
import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "./supabaseAdmin";

export type RagQueryEventStatus = "ok" | "zero_results" | "embedding_failed" | "rpc_failed";

export type InsertRagQueryEventParams = {
  source: string;
  threadId?: string | null;
  messageId?: string | null;
  queryTextHash: string;
  lang?: string | null;
  resultCount: number;
  status: RagQueryEventStatus;
  latencyMs?: number | null;
  detail?: Record<string, unknown>;
};

export function hashQuery(query: string): string {
  return createHash("sha256").update(query, "utf8").digest("hex");
}

/**
 * rag_query_events에 한 건 삽입. 실패해도 호출자에게 throw하지 않음 (로깅만).
 */
export async function insertRagQueryEvent(params: InsertRagQueryEventParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("rag_query_events").insert({
      source: params.source,
      thread_id: params.threadId ?? null,
      message_id: params.messageId ?? null,
      query_text_hash: params.queryTextHash,
      lang: params.lang ?? null,
      result_count: params.resultCount,
      status: params.status,
      latency_ms: params.latencyMs ?? null,
      detail: (params.detail ?? {}) as any,
    } as any);
    if (error) {
      console.error("[ragQueryEvents] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[ragQueryEvents] insert error:", e);
  }
}

/**
 * RAG_DISABLED=true 시 1건 기록. status=rpc_failed, detail.reason=disabled.
 * health 집계는 기존 by_status(rpc_failed)에 포함되므로 RPC 변경 없음.
 */
export async function logRagDisabled(params: {
  source: string;
  queryTextHash: string;
  lang?: string | null;
}): Promise<void> {
  return insertRagQueryEvent({
    source: params.source,
    queryTextHash: params.queryTextHash,
    resultCount: 0,
    status: "rpc_failed",
    detail: { reason: "disabled" },
    lang: params.lang ?? null,
  });
}
