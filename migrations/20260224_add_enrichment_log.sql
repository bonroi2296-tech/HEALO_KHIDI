-- Add enrichment_log column to track per-source data collection history
--
-- ⚠️ 2026-08-06: 이 파일은 «작성만 되고 실서비스에 적용된 적이 없었다».
--    그래서 병원 정보 자동수집이 매번 42703(없는 칸)으로 실패하고 있었다.
--    이날 실제로 적용 완료(add_hospitals_enrichment_log). 다시 돌려도 안전하다(IF NOT EXISTS).
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS enrichment_log JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.hospitals.enrichment_log IS
  'Per-source enrichment tracking: { "google": { "last_run": "...", "status": "success", "items": [...] }, ... }';
