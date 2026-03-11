-- ============================================================
-- AUTO-IMPROVEMENT-V2: 자동 평가/개선/AB/승격/퇴출 스키마
-- ============================================================

-- A-1) playbook_patterns 컬럼 추가 (8개, 멱등)
ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS auto_version int NOT NULL DEFAULT 1;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS auto_parent_id uuid NULL REFERENCES public.playbook_patterns(id);

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS auto_score int NOT NULL DEFAULT 0;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS auto_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS last_auto_action_at timestamptz;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS traffic_split int NOT NULL DEFAULT 0;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS ab_bucket text NULL;

-- CHECK constraints (safe: only add if not exists via DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_auto_score_range'
  ) THEN
    ALTER TABLE public.playbook_patterns
      ADD CONSTRAINT chk_auto_score_range CHECK (auto_score >= 0 AND auto_score <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_auto_status_values'
  ) THEN
    ALTER TABLE public.playbook_patterns
      ADD CONSTRAINT chk_auto_status_values CHECK (
        auto_status IN ('none','candidate','drafted','auto_approved','ab_testing','promoted','auto_retired','blocked')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_traffic_split_range'
  ) THEN
    ALTER TABLE public.playbook_patterns
      ADD CONSTRAINT chk_traffic_split_range CHECK (traffic_split >= 0 AND traffic_split <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ab_bucket_values'
  ) THEN
    ALTER TABLE public.playbook_patterns
      ADD CONSTRAINT chk_ab_bucket_values CHECK (ab_bucket IN ('control','variant'));
  END IF;
END $$;

-- A-2) auto_jobs 테이블
CREATE TABLE IF NOT EXISTS public.auto_jobs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  started_at  timestamptz,
  finished_at timestamptz,
  job_type    text        NOT NULL CHECK (job_type IN ('daily_eval','auto_improve','ab_finalize')),
  status      text        NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  error       text,
  stats       jsonb       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.auto_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auto_jobs_service ON public.auto_jobs;
CREATE POLICY auto_jobs_service ON public.auto_jobs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- A-3) auto_job_events 테이블
CREATE TABLE IF NOT EXISTS public.auto_job_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  job_id      uuid        NOT NULL REFERENCES public.auto_jobs(id),
  pattern_id  uuid,
  action      text        NOT NULL,
  result      text,
  detail      jsonb       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.auto_job_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auto_job_events_service ON public.auto_job_events;
CREATE POLICY auto_job_events_service ON public.auto_job_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- A-4) 인덱스
CREATE INDEX IF NOT EXISTS idx_pp_auto_status_eval
  ON public.playbook_patterns (auto_status, last_evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_auto_parent
  ON public.playbook_patterns (auto_parent_id);

CREATE INDEX IF NOT EXISTS idx_auto_jobs_type_created
  ON public.auto_jobs (job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_job_events_job_created
  ON public.auto_job_events (job_id, created_at);
