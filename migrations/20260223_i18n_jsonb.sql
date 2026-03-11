-- Migration: i18n JSONB column for multilingual support
-- Date: 2026-02-23
-- Purpose: Store all language translations in a single extensible JSONB column

-- ============================================================================
-- ADD i18n JSONB COLUMN
-- ============================================================================

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS i18n JSONB DEFAULT '{}'::jsonb;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS i18n JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN hospitals.i18n IS 'Multilingual data: {"ko":{"name":"...","description":"...","tags":[...],"specialties":[...],"location":"..."},"en":{...},"zh":{...},"ja":{...}}';
COMMENT ON COLUMN treatments.i18n IS 'Multilingual data: {"ko":{"name":"...","description":"...","tags":[...]},"en":{...},"zh":{...},"ja":{...}}';

-- ============================================================================
-- MIGRATE EXISTING _kr DATA INTO i18n.ko
-- ============================================================================

UPDATE hospitals
SET i18n = jsonb_build_object(
  'ko', jsonb_strip_nulls(jsonb_build_object(
    'name', name_kr,
    'description', description_kr,
    'tags', CASE WHEN tags_kr IS NOT NULL AND array_length(tags_kr, 1) > 0 THEN to_jsonb(tags_kr) ELSE NULL END,
    'specialties', CASE WHEN specialties_kr IS NOT NULL AND array_length(specialties_kr, 1) > 0 THEN to_jsonb(specialties_kr) ELSE NULL END,
    'location', location_kr
  )),
  'en', jsonb_strip_nulls(jsonb_build_object(
    'name', name,
    'description', description,
    'tags', CASE WHEN tags IS NOT NULL AND array_length(tags, 1) > 0 THEN to_jsonb(tags) ELSE NULL END,
    'specialties', CASE WHEN specialties IS NOT NULL AND array_length(specialties, 1) > 0 THEN to_jsonb(specialties) ELSE NULL END,
    'location', location_en
  ))
)
WHERE i18n = '{}'::jsonb OR i18n IS NULL;

UPDATE treatments
SET i18n = jsonb_build_object(
  'ko', jsonb_strip_nulls(jsonb_build_object(
    'name', name_kr,
    'description', description_kr,
    'tags', CASE WHEN tags_kr IS NOT NULL AND array_length(tags_kr, 1) > 0 THEN to_jsonb(tags_kr) ELSE NULL END
  )),
  'en', jsonb_strip_nulls(jsonb_build_object(
    'name', name,
    'description', description,
    'tags', CASE WHEN tags IS NOT NULL AND array_length(tags, 1) > 0 THEN to_jsonb(tags) ELSE NULL END
  ))
)
WHERE i18n = '{}'::jsonb OR i18n IS NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_hospitals_i18n ON hospitals USING GIN(i18n);
CREATE INDEX IF NOT EXISTS idx_treatments_i18n ON treatments USING GIN(i18n);
