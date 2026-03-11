-- ============================================================
-- CHAT-LOG-V1: chat_threads + chat_messages
-- 환자↔관리자 대화 로그 저장 + resolved 시 playbook draft 자동 생성
-- ============================================================

-- 1) chat_threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  inquiry_id              bigint      NULL REFERENCES public.inquiries(id),
  normalized_inquiry_id   uuid        NULL REFERENCES public.normalized_inquiries(id),
  public_token            uuid        NULL,
  status                  text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','resolved','closed')),
  subject                 text,
  metadata                jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- 2) chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid        NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  actor_type    text        NOT NULL CHECK (actor_type IN ('patient','admin','system')),
  actor_id      uuid        NULL,
  message_text  text        NOT NULL,
  attachments   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_internal   boolean     NOT NULL DEFAULT false,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_threads_status_updated
  ON public.chat_threads (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_inquiry
  ON public.chat_threads (inquiry_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_normalized_inquiry
  ON public.chat_threads (normalized_inquiry_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_actor_created
  ON public.chat_messages (actor_type, created_at DESC);

-- 4) RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- service_role: 전체 접근 (admin API에서 사용)
DROP POLICY IF EXISTS chat_threads_service_only ON public.chat_threads;
CREATE POLICY chat_threads_service_only
  ON public.chat_threads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS chat_messages_service_only ON public.chat_messages;
CREATE POLICY chat_messages_service_only
  ON public.chat_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 환자(anon): public_token 기반으로 자기 thread의 non-internal 메시지만 조회
DROP POLICY IF EXISTS chat_messages_patient_read ON public.chat_messages;
CREATE POLICY chat_messages_patient_read
  ON public.chat_messages FOR SELECT
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND t.public_token IS NOT NULL
    )
  );
