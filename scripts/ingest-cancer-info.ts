/**
 * 암종별 치료 안내(immuneCancerDetails.js) → RAG 적재 트리거.
 * 실제 운영 경로는 POST /api/rag/ingest {"sourceTypes":["cancer_info"]} (admin).
 * 정본 파일이 바뀌면 이걸 다시 돌린다(내용이 같으면 upsert 가 건너뛴다).
 *
 *   npx tsx --conditions=react-server scripts/ingest-cancer-info.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { ingestSources } from "../src/lib/rag/ingest";

ingestSources(["cancer_info"] as any)
  .then((r) => {
    console.log("적재 완료:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error("적재 실패:", e?.message || e);
    process.exit(1);
  });
