#!/usr/bin/env node
/**
 * RAG 임베딩 백필 스크립트 (Gemini text-embedding-004)
 *
 * rag_chunks에서 embedding IS NULL인 행을 배치로 읽어
 * Gemini text-embedding-004로 임베딩을 생성하고 업데이트한다.
 *
 * 사용법:
 *   node scripts/rag_backfill_embeddings.mjs
 *
 * 환경변수 필수:
 *   GOOGLE_GENERATIVE_AI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL (또는 VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";

// ── 환경변수 ────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "50", 10);
const SLEEP_MS = parseInt(process.env.SLEEP_MS || "500", 10);

if (!GEMINI_API_KEY) {
  console.error(
    "❌ GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요."
  );
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Gemini 배치 임베딩 ──────────────────────────────────
async function fetchEmbeddings(texts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`;

  const requests = texts.map((text) => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: EMBEDDING_DIMS,
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.embeddings.map((e) => e.values);
}

// ── 메인 ────────────────────────────────────────────────
async function main() {
  console.log("🚀 RAG 임베딩 백필 시작");
  console.log(`   모델: ${EMBEDDING_MODEL} (Gemini, ${EMBEDDING_DIMS}차원)`);
  console.log(`   배치 크기: ${BATCH_SIZE}`);
  console.log(`   배치 간 대기: ${SLEEP_MS}ms`);

  let totalProcessed = 0;
  let totalFailed = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: chunks, error } = await supabase
      .from("rag_chunks")
      .select("id, content")
      .is("embedding", null)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error("❌ 청크 조회 실패:", error.message);
      break;
    }

    if (!chunks || chunks.length === 0) {
      hasMore = false;
      break;
    }

    console.log(
      `\n📦 배치: ${chunks.length}건 (누적 처리: ${totalProcessed})`
    );

    try {
      const texts = chunks.map((c) => c.content || "");
      const embeddings = await fetchEmbeddings(texts);
      const now = new Date().toISOString();

      let batchFailed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const { error: updateError } = await supabase
          .from("rag_chunks")
          .update({
            embedding: JSON.stringify(embeddings[i]),
            embedding_model: EMBEDDING_MODEL,
            embedded_at: now,
          })
          .eq("id", chunks[i].id);

        if (updateError) {
          console.warn(
            `  ⚠️ 업데이트 실패 (id=${chunks[i].id}): ${updateError.message}`
          );
          batchFailed++;
        }
      }

      totalProcessed += chunks.length - batchFailed;
      totalFailed += batchFailed;
      console.log(
        `  ✅ ${chunks.length - batchFailed}건 성공${batchFailed > 0 ? `, ⚠️ ${batchFailed}건 실패` : ""}`
      );
    } catch (err) {
      console.error(`  ❌ 배치 임베딩 실패: ${err.message}`);
      totalFailed += chunks.length;
    }

    if (chunks.length === BATCH_SIZE) {
      await new Promise((r) => setTimeout(r, SLEEP_MS));
    } else {
      hasMore = false;
    }
  }

  console.log("\n════════════════════════════════");
  console.log(`✅ 완료: ${totalProcessed}건 처리, ${totalFailed}건 실패`);
  console.log("════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ 스크립트 오류:", err);
  process.exit(1);
});
