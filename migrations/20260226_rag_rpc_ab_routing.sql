-- ============================================================
-- AUTO-IMPROVEMENT-V2: RPC AB 라우팅 지원
--
-- p_ab_enabled / p_thread_hash 파라미터 추가 (하위호환)
-- AB 모드 ON: traffic_split 기준 control/variant 분배
-- AB 모드 OFF (기본): canonical_id IS NULL 만 반환 (기존 동작)
-- ============================================================

CREATE OR REPLACE FUNCTION public.rag_search_chunks_v1_1(
  query_embedding vector(768),
  match_count int DEFAULT 6,
  p_lang text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_partner_only boolean DEFAULT false,
  p_ab_enabled boolean DEFAULT false,
  p_thread_hash int DEFAULT 0
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
  LEFT JOIN playbook_patterns pp
    ON d.source_type = 'playbook_pattern'
   AND pp.id = d.source_id::uuid
  WHERE c.embedding IS NOT NULL
    AND (d.expires_at IS NULL OR d.expires_at > now())
    AND (p_lang IS NULL OR d.lang = p_lang)
    AND (p_source_type IS NULL OR d.source_type = p_source_type)
    AND (NOT p_partner_only OR d.trust_tier <= 2)
    AND (d.metadata IS NULL
         OR d.metadata->>'ingest_status' IS NULL
         OR d.metadata->>'ingest_status' = 'done')
    AND (
      d.source_type <> 'playbook_pattern'
      OR (
        pp.id IS NOT NULL
        AND pp.status = 'approved'
        AND pp.is_active = true
        AND (
          CASE WHEN p_ab_enabled AND pp.ab_bucket IS NOT NULL THEN
            (pp.ab_bucket = 'control' AND p_thread_hash >= pp.traffic_split)
            OR (pp.ab_bucket = 'variant' AND p_thread_hash < pp.traffic_split)
          ELSE
            pp.canonical_id IS NULL
          END
        )
      )
    )
  ORDER BY d.trust_tier ASC, c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
