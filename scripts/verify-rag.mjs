#!/usr/bin/env node
/**
 * RAG 회귀 방지: RAG 경로에서 금지 패턴이 없어야 CI 통과.
 * - safeSearch / api/rag/search / generateReply에서 rag_documents/rag_chunks 직접 조회·ILIKE 금지
 * 실행: npm run verify:rag
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CHECKS = [
  {
    file: "src/lib/rag/safeSearch.ts",
    forbidden: [
      [/.from\s*\(\s*["']rag_documents["']\)/, "direct .from('rag_documents')"],
      [/.from\s*\(\s*["']rag_chunks["']\)/, "direct .from('rag_chunks')"],
      [/\.from\s*\(\s*["']rag_/, "direct .from('rag_*') (use RPC only)"],
    ],
  },
  {
    file: "app/api/rag/search/route.ts",
    forbidden: [
      [/.from\s*\(\s*["']rag_documents["']\)/, "direct .from('rag_documents')"],
      [/.from\s*\(\s*["']rag_chunks["']\)/, "direct .from('rag_chunks')"],
    ],
  },
  {
    file: "src/lib/chat/generateReply.ts",
    forbidden: [
      [/.from\s*\(\s*["']rag_documents["']\)/, "direct .from('rag_documents')"],
      [/.from\s*\(\s*["']rag_chunks["']\)/, "direct .from('rag_chunks')"],
    ],
  },
];

let failed = false;
for (const { file, forbidden } of CHECKS) {
  const filePath = path.join(ROOT, file);
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (e) {
    console.error(`[verify:rag] Cannot read ${file}:`, e.message);
    process.exit(1);
  }
  for (const [pattern, label] of forbidden) {
    if (pattern.test(content)) {
      console.error(`[verify:rag] FAIL ${file}: forbidden pattern "${label}"`);
      failed = true;
    }
  }
}
if (failed) {
  console.error("[verify:rag] RAG regression guard failed. Fix forbidden patterns.");
  process.exit(1);
}
console.log("[verify:rag] OK — no forbidden RAG patterns.");
