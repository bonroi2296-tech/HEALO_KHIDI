-- ============================================================
-- RAG Vector V1 → Gemini: vector(1536) → vector(768) 전환
-- ============================================================
-- 기존 embedding 컬럼은 전부 NULL (백필 미완료)이므로 데이터 손실 없음
-- Gemini text-embedding-004 출력: 768차원
-- ============================================================

-- 1) 기존 HNSW 인덱스 삭제 (vector(1536) 기준이라 재생성 필요)
DROP INDEX IF EXISTS public.idx_rag_chunks_embedding_hnsw;

-- 2) embedding 컬럼 차원 변경 (1536 → 768)
ALTER TABLE public.rag_chunks
  DROP COLUMN IF EXISTS embedding;

ALTER TABLE public.rag_chunks
  ADD COLUMN embedding vector(768);

-- 3) HNSW 벡터 인덱스 재생성 (768차원, cosine)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw
  ON public.rag_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- 4) RPC 함수 업데이트 (vector(1536) → vector(768))
CREATE OR REPLACE FUNCTION public.rag_search_chunks_v1(
  query_embedding vector(768),
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
