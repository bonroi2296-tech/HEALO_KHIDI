-- ============================================================
-- PLAYBOOK-PATTERN-V1: playbook_patterns 테이블
-- 응대 논리 구조(패턴) 추출 → 승인 → RAG 우선 참조
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playbook_patterns (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  source_thread_id     uuid        NULL REFERENCES public.chat_threads(id),
  source_message_ids   uuid[]      NOT NULL DEFAULT '{}',
  language             text        NOT NULL DEFAULT 'en',
  scope                text        NOT NULL DEFAULT 'general'
    CHECK (scope IN ('treatment','country','general')),
  treatment_slug       text        NULL,
  country              text        NULL,
  trigger              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  user_intent          text        NOT NULL,
  key_questions        text[]      NOT NULL DEFAULT '{}',
  response_structure   jsonb       NOT NULL,
  response_template    text        NOT NULL,
  safety_notes         text[]      NOT NULL DEFAULT '{}',
  quality_score        int         NOT NULL DEFAULT 0
    CHECK (quality_score >= 0 AND quality_score <= 100),
  status               text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','rejected')),
  approved_at          timestamptz,
  approved_by          uuid,
  rag_document_id      uuid        NULL REFERENCES public.rag_documents(id),
  metadata             jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_playbook_patterns_status_updated
  ON public.playbook_patterns (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_lang_treatment
  ON public.playbook_patterns (language, treatment_slug);

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_country
  ON public.playbook_patterns (country);

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_quality
  ON public.playbook_patterns (quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_thread
  ON public.playbook_patterns (source_thread_id);

-- RLS: service_role only
ALTER TABLE public.playbook_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS playbook_patterns_service_only ON public.playbook_patterns;
CREATE POLICY playbook_patterns_service_only
  ON public.playbook_patterns FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
