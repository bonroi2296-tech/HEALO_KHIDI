-- hospital_offer_enrich_jobs: 비동기 대표시술 설명(enrich) 작업
-- preview는 3초 내 응답, LLM 기반 설명/관련정보는 이 job으로 처리
CREATE TABLE IF NOT EXISTS public.hospital_offer_enrich_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'error')),
  payload jsonb DEFAULT '{}',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_offer_enrich_jobs_hospital_id ON public.hospital_offer_enrich_jobs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_offer_enrich_jobs_status ON public.hospital_offer_enrich_jobs(status) WHERE status = 'queued';

COMMENT ON TABLE public.hospital_offer_enrich_jobs IS '대표시술 LLM 설명 생성 비동기 job (preview는 무조건 3초 내 응답)';
