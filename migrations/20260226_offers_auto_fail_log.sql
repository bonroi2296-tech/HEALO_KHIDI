-- 시술 자동생성 실패 로그: 병원별로 실패 사유 저장, 다음에 시도하지 않을 수 있게 표시
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS offers_auto_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offers_auto_fail_reason TEXT,
  ADD COLUMN IF NOT EXISTS offers_auto_skip BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hospitals.offers_auto_failed_at IS '시술 자동생성(Preview) 마지막 실패 시각';
COMMENT ON COLUMN public.hospitals.offers_auto_fail_reason IS '실패 사유 (no_website, crawl_error, no_content, no_offers_extracted, llm_unavailable 등)';
COMMENT ON COLUMN public.hospitals.offers_auto_skip IS 'true면 이 병원은 시술 자동생성 건너뛰기로 표시';
