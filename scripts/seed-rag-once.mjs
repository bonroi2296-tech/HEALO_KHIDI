#!/usr/bin/env node
/**
 * RAG 1회 재적재 — hospitals/treatments/reviews/normalized_inquiries 를 rag_documents/rag_chunks 로 갱신.
 *
 * ingestSources 는 is_published=true 행만 끌어온다(미게시·TEST 더미 제외 — 공개 페이지와 동일 가시성).
 * upsert 라 내용이 안 바뀐 행은 재임베딩 안 함(저렴). 새/변경 행만 임베딩.
 *
 * 실행:
 *   node --conditions=react-server --import tsx scripts/seed-rag-once.mjs
 *   node --conditions=react-server --import tsx scripts/seed-rag-once.mjs treatment hospital   # 특정 소스만
 *
 * 필수 env(.env.local): SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY
 */
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

const sources = process.argv.slice(2);
const { ingestSources } = await import("../src/lib/rag/ingest.ts");

const results = await ingestSources(sources.length ? sources : undefined);
console.log("[seed-rag] 갱신된 문서 수:", results);
