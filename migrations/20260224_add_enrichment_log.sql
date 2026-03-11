-- Add enrichment_log column to track per-source data collection history
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS enrichment_log JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.hospitals.enrichment_log IS
  'Per-source enrichment tracking: { "google": { "last_run": "...", "status": "success", "items": [...] }, ... }';
