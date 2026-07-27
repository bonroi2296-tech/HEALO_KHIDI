/**
 * 센터 메뉴판(center_menu_items) → RAG 적재 1회성 트리거.
 * 실제 운영 경로는 POST /api/rag/ingest {"sourceTypes":["center_menu"]} (admin).
 * 이 스크립트는 같은 ingestSources()를 그대로 불러 로컬에서 적재·재적재할 때 쓴다.
 *
 *   npx tsx --conditions=react-server scripts/ingest-center-menu.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { ingestSources } from "../src/lib/rag/ingest";

ingestSources(["center_menu"] as any)
  .then((r) => {
    console.log("적재 완료:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error("적재 실패:", e?.message || e);
    process.exit(1);
  });
