-- ============================================================
-- RAG V1.1: Trust Tier + Retrieval 품질 제어
-- ============================================================
-- rag_documents에 trust tier 관련 컬럼 추가 (모두 멱등)
-- 기존 데이터: trust_tier=3(공개수집) 기본값으로 자동 적용
-- ============================================================

-- 1) trust_tier: 1=공공/공식, 2=제휴 승인, 3=공개 수집
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS trust_tier int NOT NULL DEFAULT 3;

-- 2) source_label: 사람이 읽을 수 있는 출처명
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS source_label text;

-- 3) source_url: 원본 출처 URL
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS source_url text;

-- 4) expires_at: 이 시각 이후 검색 결과에서 제외
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 5) verified_at / verified_by: 검증 이력
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- 6) 인덱스: trust_tier + expires_at 조합 조회 최적화
CREATE INDEX IF NOT EXISTS idx_rag_documents_trust_tier
  ON public.rag_documents (trust_tier, expires_at);

-- ============================================================
-- RPC: rag_search_chunks_v1_1
-- trust_tier 우선 정렬 + expires 필터 + partner_only 모드
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
  ORDER BY d.trust_tier ASC, c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
