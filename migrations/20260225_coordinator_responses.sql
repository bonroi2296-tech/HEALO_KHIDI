-- ============================================================
-- PLAYBOOK-V1: coordinator_responses 테이블
-- Human 응대 원문 + PII 정제본 + 승인 워크플로우
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coordinator_responses (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  normalized_inquiry_id     uuid        NULL REFERENCES public.normalized_inquiries(id),
  language                  text        NOT NULL DEFAULT 'en',
  case_tags                 text[]      NOT NULL DEFAULT '{}',
  response_text_raw         text        NOT NULL,
  response_text_sanitized   text        NOT NULL,
  quality_score             int         NOT NULL DEFAULT 0,
  status                    text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','rejected')),
  approved_at               timestamptz,
  approved_by               uuid,
  rag_document_id           uuid        NULL REFERENCES public.rag_documents(id),
  metadata                  jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_coordinator_responses_status_created
  ON public.coordinator_responses (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coordinator_responses_inquiry
  ON public.coordinator_responses (normalized_inquiry_id);

CREATE INDEX IF NOT EXISTS idx_coordinator_responses_quality
  ON public.coordinator_responses (quality_score DESC);

-- RLS: service_role only (admin API에서만 접근)
ALTER TABLE public.coordinator_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coordinator_responses_service_only ON public.coordinator_responses;
CREATE POLICY coordinator_responses_service_only
  ON public.coordinator_responses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
