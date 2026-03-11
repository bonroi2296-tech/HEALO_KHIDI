-- ============================================================
-- PLAYBOOK-ANALYTICS-V1: playbook_usage_events
-- AI 응답 시 playbook_pattern 회수/사용 로그
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playbook_usage_events (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  thread_id               uuid        NULL REFERENCES public.chat_threads(id),
  message_id              uuid        NULL REFERENCES public.chat_messages(id),
  language                text        NOT NULL DEFAULT 'en',
  query_text_hash         text        NOT NULL,
  query_len               int         NOT NULL,
  model                   text        NULL,
  retrieved_count         int         NOT NULL DEFAULT 0,
  retrieved_pattern_ids   uuid[]      NOT NULL DEFAULT '{}',
  used                    boolean     NOT NULL DEFAULT false,
  used_pattern_id         uuid        NULL,
  handoff_requested       boolean     NOT NULL DEFAULT false,
  rag_scoring             text        NULL,
  latency_ms              int         NULL,
  metadata                jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pue_created
  ON public.playbook_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pue_thread_created
  ON public.playbook_usage_events (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pue_used_created
  ON public.playbook_usage_events (used, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pue_pattern_ids
  ON public.playbook_usage_events USING GIN (retrieved_pattern_ids);

ALTER TABLE public.playbook_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pue_service_only ON public.playbook_usage_events;
CREATE POLICY pue_service_only
  ON public.playbook_usage_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
