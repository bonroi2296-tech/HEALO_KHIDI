-- hospital_offer_jobs: 대표 시술 생성 비동기 job (Preview는 200~500ms 내 job_id만 반환)
-- Worker: crawl → 대표 페이지 선택 → chunk → 가격힌트 → LLM 1회 배치 → 결과 저장
CREATE TABLE IF NOT EXISTS public.hospital_offer_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'error')),
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result_offers jsonb,
  debug jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_offer_jobs_hospital_id ON public.hospital_offer_jobs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_offer_jobs_status ON public.hospital_offer_jobs(status) WHERE status IN ('queued', 'running');

COMMENT ON TABLE public.hospital_offer_jobs IS '대표 시술 자동 생성 비동기 job; Preview API는 job 생성만 하고 Worker가 crawl+LLM 수행';
