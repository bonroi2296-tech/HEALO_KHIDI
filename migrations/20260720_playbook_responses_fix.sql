-- ============================================================
-- POSTMORTEMS #97 수리 — 플레이북 응대 저장 되살리기
--
-- 배경: migrations/20260225_coordinator_responses.sql 이 PLAYBOOK-V1 스키마로
--   `coordinator_responses` 를 만들려 했으나, **동명의 기존 테이블**(병원 견적 응답용:
--   inquiry_id·hospital_id·quoted_price·currency·is_final …)이 이미 있었다.
--   `CREATE TABLE IF NOT EXISTS` 는 이 충돌에서 에러 없이 조용히 no-op → 마이그레이션은
--   "성공"으로 기록되고, 플레이북 코드는 그날부터 없는 컬럼에 INSERT → 항상 실패 → 0건.
--
-- 수리 방침: 기존 견적 테이블에 관련 없는 컬럼 9개를 욱여넣지 않는다(이름 충돌이 애초
--   원인인데 한 테이블에 두 기능을 겹치면 더 나빠짐). **제 이름의 테이블을 새로 만들고**
--   플레이북 코드를 그쪽으로 돌린다. 기존 `coordinator_responses`(견적)는 손대지 않음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.playbook_responses (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  normalized_inquiry_id     uuid        NULL REFERENCES public.normalized_inquiries(id) ON DELETE SET NULL,
  language                  text        NOT NULL DEFAULT 'en',
  case_tags                 text[]      NOT NULL DEFAULT '{}',
  response_text_raw         text        NOT NULL,
  response_text_sanitized   text        NOT NULL,
  quality_score             int         NOT NULL DEFAULT 0,
  status                    text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','rejected')),
  approved_at               timestamptz,
  approved_by               uuid,
  rag_document_id           uuid        NULL REFERENCES public.rag_documents(id) ON DELETE SET NULL,
  metadata                  jsonb       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_playbook_responses_status_created
  ON public.playbook_responses (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_responses_inquiry
  ON public.playbook_responses (normalized_inquiry_id);
CREATE INDEX IF NOT EXISTS idx_playbook_responses_quality
  ON public.playbook_responses (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_responses_language
  ON public.playbook_responses (language);

-- RLS: service_role 전용 (어드민 API 경유만 — 환자 응대 원문에 PII 가능)
ALTER TABLE public.playbook_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS playbook_responses_service_only ON public.playbook_responses;
CREATE POLICY playbook_responses_service_only
  ON public.playbook_responses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_playbook_responses_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_playbook_responses_updated_at ON public.playbook_responses;
CREATE TRIGGER trg_playbook_responses_updated_at
  BEFORE UPDATE ON public.playbook_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_playbook_responses_updated_at();
