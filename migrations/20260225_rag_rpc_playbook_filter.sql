-- ============================================================
-- PLAYBOOK-RPC-FILTER-V1: playbook_pattern 상태 기반 DB 레벨 필터
--
-- 불변조건:
-- 1) playbook_pattern 문서 중 is_active=false 또는 canonical_id IS NOT NULL
--    또는 status<>'approved' 인 패턴은 절대 반환되지 않음
-- 2) 다른 source_type(hospital, treatment, official 등)은 기존 동작 그대로
-- 3) ingest_status, expires_at, trust_tier 정렬 모두 유지
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
  LEFT JOIN playbook_patterns pp
    ON d.source_type = 'playbook_pattern'
   AND pp.id = d.source_id::uuid
  WHERE c.embedding IS NOT NULL
    -- expires_at 필터
    AND (d.expires_at IS NULL OR d.expires_at > now())
    -- 언어 필터
    AND (p_lang IS NULL OR d.lang = p_lang)
    -- source_type 필터
    AND (p_source_type IS NULL OR d.source_type = p_source_type)
    -- partner_only 필터
    AND (NOT p_partner_only OR d.trust_tier <= 2)
    -- ingest_status 필터(하위호환: null='done')
    AND (d.metadata IS NULL
         OR d.metadata->>'ingest_status' IS NULL
         OR d.metadata->>'ingest_status' = 'done')
    -- playbook_pattern 거버넌스 필터:
    -- source_type이 playbook_pattern이 아니면 무조건 통과
    -- source_type이 playbook_pattern이면 pp 조건 충족해야 함
    AND (
      d.source_type <> 'playbook_pattern'
      OR (
        pp.id IS NOT NULL
        AND pp.is_active = true
        AND pp.canonical_id IS NULL
        AND pp.status = 'approved'
      )
    )
  ORDER BY d.trust_tier ASC, c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
