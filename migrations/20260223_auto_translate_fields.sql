-- Migration: Auto-translation support fields
-- Date: 2026-02-23
-- Purpose: Add Korean original (_kr) columns for auto-translation

-- ============================================================================
-- HOSPITALS TABLE: Korean original fields
-- ============================================================================

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS name_kr TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS description_kr TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS tags_kr TEXT[] DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS specialties_kr TEXT[] DEFAULT '{}';

COMMENT ON COLUMN hospitals.name_kr IS '병원명 한국어 원문 (자동번역 시 보존)';
COMMENT ON COLUMN hospitals.description_kr IS '병원 소개 한국어 원문';
COMMENT ON COLUMN hospitals.tags_kr IS '태그 한국어 원문 배열';
COMMENT ON COLUMN hospitals.specialties_kr IS '진료과목 한국어 원문 배열';

-- ============================================================================
-- TREATMENTS TABLE: Korean original fields
-- ============================================================================

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS name_kr TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS description_kr TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS tags_kr TEXT[] DEFAULT '{}';

COMMENT ON COLUMN treatments.name_kr IS '시술명 한국어 원문 (자동번역 시 보존)';
COMMENT ON COLUMN treatments.description_kr IS '시술 설명 한국어 원문';
COMMENT ON COLUMN treatments.tags_kr IS '태그 한국어 원문 배열';
