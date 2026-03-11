-- ============================================================
-- INGEST-STATUS-V1: RPC에 ingest_status 필터 추가
-- null(기존 문서) 또는 'done'만 검색 대상
-- pending/failed 문서는 검색에서 자동 제외
-- ============================================================

CREATE OR REPLACE FUNCTION public.rag_search_chunks_v1_1(
  query_embedding vector(768),
  match_count int DEFAULT 6,
  p_lang text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_partner_only boolean DEFAULT false
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  chunk_index     int,
  content         text,
  metadata        jsonb,
  similarity_score float8,
  trust_tier      int,
  source_label    text,
  source_url      text,
  doc_title       text,
  doc_lang        text,
  doc_source_type text,
  doc_source_id   uuid
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
    (1 - (c.embedding <=> query_embedding))::float8 AS similarity_score,
    d.trust_tier    AS trust_tier,
    d.source_label  AS source_label,
    d.source_url    AS source_url,
    d.title         AS doc_title,
    d.lang          AS doc_lang,
    d.source_type   AS doc_source_type,
    d.source_id     AS doc_source_id
  FROM rag_chunks c
  INNER JOIN rag_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (d.expires_at IS NULL OR d.expires_at > now())
    AND (p_lang IS NULL OR d.lang = p_lang)
    AND (p_source_type IS NULL OR d.source_type = p_source_type)
    AND (NOT p_partner_only OR d.trust_tier <= 2)
    AND (d.metadata IS NULL
         OR d.metadata->>'ingest_status' IS NULL
         OR d.metadata->>'ingest_status' = 'done')
  ORDER BY d.trust_tier ASC, c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
