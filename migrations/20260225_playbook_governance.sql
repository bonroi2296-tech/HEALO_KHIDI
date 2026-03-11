-- ============================================================
-- PLAYBOOK-GOVERNANCE-V1: 품질 게이트 + 중복/병합 컬럼
-- ============================================================

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS canonical_id uuid NULL REFERENCES public.playbook_patterns(id);

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS merged_at timestamptz;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS merged_by uuid;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS quality_gate jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_active_status
  ON public.playbook_patterns (is_active, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_playbook_patterns_canonical
  ON public.playbook_patterns (canonical_id);
