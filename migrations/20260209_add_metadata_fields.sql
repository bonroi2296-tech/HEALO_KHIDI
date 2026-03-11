-- Migration: Add extended metadata fields for hospitals and treatments
-- Date: 2026-02-09
-- Purpose: Support bulk data collection with rich metadata

-- ============================================================================
-- HOSPITALS TABLE EXTENSIONS
-- ============================================================================

-- Image fields (NEW)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS thumbnail_image TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT '{}';

-- Business and registration information
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS business_registration_number TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS medical_institution_code TEXT;

-- Certifications and accreditations (JSONB array)
-- Format: [{"type": "JCI_ACCREDITATION", "issuer": "...", "date": "...", "valid_until": "..."}]
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Medical equipment (text array)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS medical_equipment TEXT[] NOT NULL DEFAULT '{}';

-- Insurance information
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS insurance_accepted BOOLEAN DEFAULT false;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS insurance_details JSONB;

-- Statistics and operational data
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS annual_surgery_count INTEGER;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS establishment_date DATE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS total_staff_count INTEGER;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS doctor_count INTEGER;

-- External ratings (JSONB)
-- Format: {"naver": {"rating": 4.5, "count": 120}, "kakao": {"rating": 4.3, "count": 85}}
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS external_ratings JSONB;

-- Indexes for hospitals
CREATE INDEX IF NOT EXISTS idx_hospitals_medical_institution_code 
  ON hospitals(medical_institution_code) 
  WHERE medical_institution_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospitals_medical_equipment_gin 
  ON hospitals USING GIN(medical_equipment);

CREATE INDEX IF NOT EXISTS idx_hospitals_certifications_gin 
  ON hospitals USING GIN(certifications);

-- ============================================================================
-- TREATMENTS TABLE EXTENSIONS
-- ============================================================================

-- Image fields (NEW)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS thumbnail_image TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT '{}';

-- Pricing (extend existing price_min)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS price_max NUMERIC;

-- Recovery time (in days)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS recovery_time_min INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS recovery_time_max INTEGER;

-- Recovery process detail (JSONB)
-- Format: {"day1": "...", "week1": "...", "month1": "..."}
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS recovery_process JSONB;

-- Side effects and precautions
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS side_effects TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS side_effects_detail TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS precautions TEXT[] NOT NULL DEFAULT '{}';

-- Procedure details
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS anesthesia_type TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS surgery_duration_min INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS surgery_duration_max INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS required_equipment TEXT[] NOT NULL DEFAULT '{}';

-- Insurance coverage
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS insurance_coverage BOOLEAN DEFAULT false;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS insurance_coverage_detail TEXT;

-- Statistics
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS annual_procedure_count INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2);

-- Related treatments for comparison
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS similar_treatments UUID[];

-- Comparison data (JSONB)
-- Format: {"vs_treatment_id": {"price_diff": "+20%", "recovery_diff": "-3 days", "effectiveness": "Similar"}}
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS comparison_data JSONB;

-- Indexes for treatments
CREATE INDEX IF NOT EXISTS idx_treatments_side_effects_gin 
  ON treatments USING GIN(side_effects);

CREATE INDEX IF NOT EXISTS idx_treatments_precautions_gin 
  ON treatments USING GIN(precautions);

CREATE INDEX IF NOT EXISTS idx_treatments_required_equipment_gin 
  ON treatments USING GIN(required_equipment);

CREATE INDEX IF NOT EXISTS idx_treatments_similar_treatments_gin 
  ON treatments USING GIN(similar_treatments);

-- Partial index for insurance coverage
CREATE INDEX IF NOT EXISTS idx_treatments_insurance_coverage 
  ON treatments(insurance_coverage) 
  WHERE insurance_coverage = true;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN hospitals.thumbnail_image IS '대표 썸네일 이미지 URL';
COMMENT ON COLUMN hospitals.gallery_images IS '갤러리 이미지 URL 배열 (최대 4장)';
COMMENT ON COLUMN hospitals.business_registration_number IS '사업자등록번호';
COMMENT ON COLUMN hospitals.medical_institution_code IS '요양기관기호 (건강보험심사평가원)';
COMMENT ON COLUMN hospitals.certifications IS '인증 정보 배열 (JSON)';
COMMENT ON COLUMN hospitals.medical_equipment IS '보유 의료장비 목록';
COMMENT ON COLUMN hospitals.insurance_accepted IS '보험 적용 여부';
COMMENT ON COLUMN hospitals.insurance_details IS '보험 상세 정보 (JSON)';
COMMENT ON COLUMN hospitals.annual_surgery_count IS '연간 시술 건수';
COMMENT ON COLUMN hospitals.establishment_date IS '개원일';
COMMENT ON COLUMN hospitals.total_staff_count IS '총 직원 수';
COMMENT ON COLUMN hospitals.doctor_count IS '의사 수';
COMMENT ON COLUMN hospitals.external_ratings IS '외부 평가 (네이버/카카오 등)';

COMMENT ON COLUMN treatments.thumbnail_image IS '대표 썸네일 이미지 URL';
COMMENT ON COLUMN treatments.gallery_images IS '갤러리 이미지 URL 배열';
COMMENT ON COLUMN treatments.price_max IS '최대 가격';
COMMENT ON COLUMN treatments.recovery_time_min IS '최소 회복 기간 (일)';
COMMENT ON COLUMN treatments.recovery_time_max IS '최대 회복 기간 (일)';
COMMENT ON COLUMN treatments.recovery_process IS '단계별 회복 과정 (JSON)';
COMMENT ON COLUMN treatments.side_effects IS '부작용 리스트';
COMMENT ON COLUMN treatments.side_effects_detail IS '부작용 상세 설명';
COMMENT ON COLUMN treatments.precautions IS '주의사항 리스트';
COMMENT ON COLUMN treatments.anesthesia_type IS '마취 방법';
COMMENT ON COLUMN treatments.surgery_duration_min IS '최소 시술 시간 (분)';
COMMENT ON COLUMN treatments.surgery_duration_max IS '최대 시술 시간 (분)';
COMMENT ON COLUMN treatments.required_equipment IS '필요 의료장비';
COMMENT ON COLUMN treatments.insurance_coverage IS '보험 적용 가능 여부';
COMMENT ON COLUMN treatments.insurance_coverage_detail IS '보험 적용 상세';
COMMENT ON COLUMN treatments.annual_procedure_count IS '연간 시술 건수';
COMMENT ON COLUMN treatments.success_rate IS '성공률 (%)';
COMMENT ON COLUMN treatments.similar_treatments IS '유사 시술 ID 배열';
COMMENT ON COLUMN treatments.comparison_data IS '타 시술 비교 데이터 (JSON)';
