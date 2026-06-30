-- 2026-06-29 RAG 검색 RPC 버그 수정
--
-- 증상: 모든 AI 챗 응답이 RAG 청크 0개로 떨어짐(rag_chunks_used=0, 371/371).
-- 원인: rag_search_chunks_v1_1 의 반환 컬럼 doc_source_id 가 uuid 로 선언됐으나
--       rag_documents.source_id 는 text. 함수 실행 시
--       "structure of query does not match function result type" 로 항상 실패 →
--       generateReply 의 catch 가 빈 배열로 폴백 → 지식베이스 검색이 통째로 무력화.
-- 수정: 반환타입을 text 로 정정(반환타입 변경이라 DROP 후 재생성).
--
-- 참고: 같은 적재경로의 또 다른 드리프트(ingest.ts 가 없는 컬럼 embedded_at/embedding_model 에
--       insert 시도 → PGRST204)는 src/lib/rag/ingest.ts 에서 metadata 로 옮겨 별도 수정.

DROP FUNCTION IF EXISTS public.rag_search_chunks_v1_1(vector,integer,text,text,boolean,boolean,integer);

CREATE FUNCTION public.rag_search_chunks_v1_1(
  query_embedding vector,
  match_count integer DEFAULT 6,
  p_lang text DEFAULT NULL::text,
  p_source_type text DEFAULT NULL::text,
  p_partner_only boolean DEFAULT false,
  p_ab_enabled boolean DEFAULT false,
  p_thread_hash integer DEFAULT 0
)
RETURNS TABLE(
  chunk_id uuid, document_id uuid, chunk_index integer, content text, metadata jsonb,
  similarity_score double precision, trust_tier integer, source_label text, source_url text,
  doc_title text, doc_lang text, doc_source_type text, doc_source_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.id, c.document_id, c.chunk_index, c.content, c.metadata,
    (1 - (c.embedding <=> query_embedding))::float8,
    d.trust_tier, d.source_label, d.source_url,
    d.title, d.lang, d.source_type, d.source_id
  FROM public.rag_chunks c
  INNER JOIN public.rag_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND (d.expires_at IS NULL OR d.expires_at > now())
    AND (p_lang IS NULL OR d.lang = p_lang)
    AND (p_source_type IS NULL OR d.source_type = p_source_type)
    AND (NOT p_partner_only OR COALESCE(d.trust_tier, 99) <= 2)
  ORDER BY COALESCE(d.trust_tier, 99) ASC, c.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$function$;
