-- Migration: Detail page content enhancements
-- Date: 2026-02-23
-- Purpose: Add FAQ, Before/After images, and price breakdown fields

-- ============================================================================
-- HOSPITALS TABLE: FAQ field
-- ============================================================================

-- Hospital-specific FAQ (JSONB array)
-- Format: [{"question": "What procedures do you specialize in?", "answer": "..."}]
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN hospitals.faq IS '병원별 FAQ (JSON 배열: [{question, answer}])';

-- ============================================================================
-- TREATMENTS TABLE: Before/After and Price breakdown
-- ============================================================================

-- Before/After images for visual comparison (JSONB array)
-- Format: [{"before": "url", "after": "url", "caption": "2 weeks post-procedure"}]
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS before_after_images JSONB DEFAULT '[]'::jsonb;

-- Price breakdown: what's included in the quoted price
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS price_includes TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN treatments.before_after_images IS 'Before/After 비교 이미지 (JSON 배열: [{before, after, caption}])';
COMMENT ON COLUMN treatments.price_includes IS '가격에 포함된 항목 리스트 (예: Consultation, Anesthesia)';

-- Index for price_includes search
CREATE INDEX IF NOT EXISTS idx_treatments_price_includes_gin
  ON treatments USING GIN(price_includes);
