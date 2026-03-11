-- Add crawl_schedule JSONB column to site_settings
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS crawl_schedule jsonb
DEFAULT '{"enabled": false, "frequency": "monthly", "sources": ["hira"], "last_auto_run": null}'::jsonb;
