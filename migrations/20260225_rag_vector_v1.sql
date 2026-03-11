-- ============================================================
-- RAG Vector Search V1: pgvector 임베딩 검색 기반 골격
-- ============================================================
-- 기존 rag_chunks/rag_documents 데이터 무변경, nullable 컬럼만 추가
-- OPENAI_API_KEY 없으면 기존 ILIKE 검색이 그대로 동작
-- ============================================================

-- ==============================
-- A-1) pgvector 확장 활성화
-- ==============================
CREATE EXTENSION IF NOT EXISTS vector;

-- ==============================
-- A-2) rag_chunks 확장 (모두 nullable — 기존 행 안전)
-- ==============================
ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS embedding_model text;

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- ==============================
-- A-3) HNSW 벡터 인덱스 (임베딩이 있는 행만 — partial index)
-- ==============================
-- HNSW: 삽입 시 약간 느리지만 조회 recall이 높고 Supabase 권장 방식
-- vector_cosine_ops: cosine distance 사용 (<=> 연산자)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ==============================
-- A-4) rag_documents 보조 인덱스 (lang 기준 필터링 최적화)
-- ==============================
-- 기존 unique(source_type, source_id, lang, version)은 source_type 선행이라
-- lang 기준 조회에 비효율 → (lang, source_type) 복합 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rag_documents_lang_source_type
  ON public.rag_documents (lang, source_type);

-- ============================================================
-- B) RPC 함수: rag_search_chunks_v1
-- ============================================================
-- 입력: query_embedding(1536차원), match_count, 선택적 lang/source_type 필터
-- 출력: chunk 정보 + cosine similarity score + 문서 메타 (doc_*)
-- score: 1.0 = 동일, 0.0 = 직교, -1.0 = 정반대
-- ============================================================
CREATE OR REPLACE FUNCTION public.rag_search_chunks_v1(
  query_embedding vector(1536),
  match_count int DEFAULT 6,
  p_lang text DEFAULT NULL,
  p_source_type text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id      uuid,
  document_id   uuid,
  chunk_index   int,
  content       text,
  metadata      jsonb,
  score         float8,
  doc_title     text,
  doc_lang      text,
  doc_source_type text,
  doc_source_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id            AS chunk_id,
    c.document_id   AS document_id,
    c.chunk_index   AS chunk_index,
    c.content       AS content,
    c.metadata      AS metadata,
    (1 - (c.embedding <=> query_embedding))::float8 AS score,
    d.title         AS doc_title,
    d.lang          AS doc_lang,
    d.source_type   AS doc_source_type,
    d.source_id     AS doc_source_id
  FROM rag_chunks c
  INNER JOIN rag_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (p_lang IS NULL OR d.lang = p_lang)
    AND (p_source_type IS NULL OR d.source_type = p_source_type)
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
