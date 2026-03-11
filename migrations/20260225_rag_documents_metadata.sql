-- ============================================================
-- rag_documents: metadata jsonb 컬럼 추가
--
-- approveAndIngest에서 ingest_status 추적에 필요
-- RPC rag_search_chunks_v1_1 의 d.metadata->>'ingest_status' 필터 지원
-- ============================================================

ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS metadata jsonb;
