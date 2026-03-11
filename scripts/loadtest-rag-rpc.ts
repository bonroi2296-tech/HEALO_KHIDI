/**
 * RAG 검색 RPC(rag_search_chunks_v1_1) 부하 테스트
 *
 * 목적: RPC 기본 성능 측정 (latency, 성공/실패 수)
 * 기본값은 보수적으로 설정 (프로덕션 DB 부하 최소화).
 *
 * 사용:
 *   npm run loadtest:rag
 *   npm run loadtest:rag -- --concurrency 10 --requests 100 --query "병원 추천"
 *
 * 요구사항: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

// ---------------------------------------------------------------------------
// 옵션 파싱
// ---------------------------------------------------------------------------
function parseArgs(): {
  concurrency: number;
  requests: number;
  lang: string;
  query: string;
} {
  const args = process.argv.slice(2);
  const get = (name: string, def: string): string => {
    const item = args.find((a) => a.startsWith(`--${name}=`));
    return item ? item.split("=")[1] ?? def : def;
  };
  const concurrency = Math.max(1, Math.min(100, parseInt(get("concurrency", "20"), 10) || 20));
  const requests = Math.max(1, Math.min(2000, parseInt(get("requests", "200"), 10) || 200));
  const lang = get("lang", "en").slice(0, 10);
  const query = get("query", "test inquiry").trim() || "test inquiry";
  return { concurrency, requests, lang, query };
}

// ---------------------------------------------------------------------------
// Supabase + Embedding (스크립트 전용)
// ---------------------------------------------------------------------------
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (.env.local)");
  }
  return createClient(url, key);
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY required for embedding");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIMS,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error("Invalid embedding response");
  }
  return values;
}

// ---------------------------------------------------------------------------
// Promise pool: concurrency 제한으로 요청 실행
// ---------------------------------------------------------------------------
async function runOne(
  supabase: SupabaseClient,
  queryEmbedding: string,
  lang: string
): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const { error } = await supabase.rpc("rag_search_chunks_v1_1", {
      query_embedding: queryEmbedding,
      match_count: 6,
      p_lang: lang,
      p_source_type: null,
      p_partner_only: false,
      p_ab_enabled: false,
      p_thread_hash: 0,
    });
    const latencyMs = Math.round(performance.now() - start);
    return { ok: !error, latencyMs };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export type LoadTestResult = {
  total_requests: number;
  success_count: number;
  error_count: number;
  avg_latency: number;
  p50_latency: number;
  p95_latency: number;
  max_latency: number;
  latencies_ms: number[];
};

export async function runLoadTest(opts: {
  concurrency: number;
  requests: number;
  lang: string;
  query: string;
}): Promise<LoadTestResult> {
  const { concurrency, requests, lang, query } = opts;
  const supabase = getSupabase();

  const embedding = await getEmbedding(query);
  const queryEmbedding = JSON.stringify(embedding);

  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  let nextIndex = 0;
  const workers: Promise<void>[] = [];

  const runNext = async (): Promise<void> => {
    const i = nextIndex++;
    if (i >= requests) return;
    const { ok, latencyMs } = await runOne(supabase, queryEmbedding, lang);
    latencies.push(latencyMs);
    if (ok) successCount++;
    else errorCount++;
    await runNext();
  };

  for (let w = 0; w < Math.min(concurrency, requests); w++) {
    workers.push(runNext());
  }
  await Promise.all(workers);

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sorted.length ? Math.round(sum / sorted.length) : 0;

  return {
    total_requests: requests,
    success_count: successCount,
    error_count: errorCount,
    avg_latency: avg,
    p50_latency: percentile(sorted, 50),
    p95_latency: percentile(sorted, 95),
    max_latency: sorted.length ? sorted[sorted.length - 1]! : 0,
    latencies_ms: sorted,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const opts = parseArgs();
  console.log("[loadtest-rag-rpc] RAG RPC 부하 테스트\n");
  console.log("옵션:", JSON.stringify(opts, null, 2));
  console.log("");

  const result = await runLoadTest(opts);

  console.log("--- 결과 ---");
  console.log("  total_requests:", result.total_requests);
  console.log("  success_count: ", result.success_count);
  console.log("  error_count:   ", result.error_count);
  console.log("  avg_latency:   ", result.avg_latency, "ms");
  console.log("  p50_latency:   ", result.p50_latency, "ms");
  console.log("  p95_latency:   ", result.p95_latency, "ms");
  console.log("  max_latency:   ", result.max_latency, "ms");
  console.log("");
  console.log("--- JSON summary ---");
  const summary = {
    total_requests: result.total_requests,
    success_count: result.success_count,
    error_count: result.error_count,
    avg_latency: result.avg_latency,
    p50_latency: result.p50_latency,
    p95_latency: result.p95_latency,
    max_latency: result.max_latency,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
