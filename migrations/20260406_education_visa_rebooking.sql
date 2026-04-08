/**
 * Phase 3 Migration: Education Contents + Rebooking Support
 *
 * 1. education_contents — 암종별 교육 콘텐츠 (암종×단계×카테고리)
 * 2. consultation_sessions 컬럼 추가 — rebooking_source, parent_consultation_id
 */

-- ========================================
-- 1. education_contents table
-- ========================================

CREATE TABLE IF NOT EXISTS education_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cancer_type TEXT NOT NULL,                 -- 'stomach', 'breast', 'liver', 'lung', 'thyroid'
  phase TEXT NOT NULL CHECK (phase IN (
    'week_1', 'week_2', 'month_1', 'month_3', 'month_6', 'year_1'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'medication', 'diet', 'exercise', 'warning_signs', 'mental_health'
  )),

  title TEXT NOT NULL,                       -- Korean default
  body TEXT NOT NULL,                        -- Korean default
  i18n JSONB DEFAULT '{}'::jsonb,            -- { en: {title, body}, ru: {title, body}, ... }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for primary query pattern
CREATE INDEX IF NOT EXISTS idx_education_cancer_phase
ON education_contents(cancer_type, phase);

-- Category filter
CREATE INDEX IF NOT EXISTS idx_education_category
ON education_contents(category);

-- Unique constraint: one content per cancer_type + phase + category
CREATE UNIQUE INDEX IF NOT EXISTS uq_education_type_phase_cat
ON education_contents(cancer_type, phase, category);

-- ========================================
-- 2. consultation_sessions — rebooking columns
-- ========================================

ALTER TABLE consultation_sessions
ADD COLUMN IF NOT EXISTS rebooking_source TEXT CHECK (rebooking_source IN ('followup', 'symptom', 'doctor'));

ALTER TABLE consultation_sessions
ADD COLUMN IF NOT EXISTS parent_consultation_id BIGINT REFERENCES consultation_sessions(id);

CREATE INDEX IF NOT EXISTS idx_consultation_rebooking_parent
ON consultation_sessions(parent_consultation_id)
WHERE parent_consultation_id IS NOT NULL;

-- ========================================
-- 3. Comments
-- ========================================

COMMENT ON TABLE education_contents IS 'Patient education content by cancer type, phase, and category';
COMMENT ON COLUMN education_contents.phase IS 'Follow-up phase: week_1, week_2, month_1, month_3, month_6, year_1';
COMMENT ON COLUMN education_contents.category IS 'Content category: medication, diet, exercise, warning_signs, mental_health';
COMMENT ON COLUMN education_contents.i18n IS 'JSONB multilingual content: { en: {title, body}, ru: {title, body}, ... }';
COMMENT ON COLUMN consultation_sessions.rebooking_source IS 'How rebooking was triggered: followup, symptom, or doctor';
COMMENT ON COLUMN consultation_sessions.parent_consultation_id IS 'Link to original consultation for rebooking chain';
