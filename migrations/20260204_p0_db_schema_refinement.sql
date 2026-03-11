-- ============================================
-- HEALO: P0 DB 스키마 고도화 및 정제
-- ============================================
-- 목적:
--   1. admin_audit_logs.inquiry_ids 인덱스 최적화
--   2. ARRAY 타입 명확화 (text[] 통일 + 기본값)
--   3. inquiries.attachment deprecated 처리
--   4. normalized_inquiries 마케팅 추적 컬럼 추가
-- 날짜: 2026-02-04
-- ============================================

-- ==========================================
-- 1. admin_audit_logs.inquiry_ids 최적화
-- ==========================================
-- inquiry_ids는 이미 bigint[]로 변경됨 (20260130_harden_audit_inquiry_ids_to_bigint_array.sql)
-- 기존 GIN 인덱스가 있지만, 추가 최적화 인덱스 생성

-- 특정 inquiry_id를 포함하는 로그 검색용 (기존 GIN 인덱스로 충분)
-- CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_inquiry_ids_gin 
--   ON public.admin_audit_logs USING GIN(inquiry_ids);

-- inquiry_ids 배열 크기별 검색 (대량 조회 vs 단일 조회 분석용)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_inquiry_ids_array_length
  ON public.admin_audit_logs((array_length(inquiry_ids, 1))) 
  WHERE inquiry_ids IS NOT NULL;

COMMENT ON INDEX idx_admin_audit_logs_inquiry_ids_array_length IS 
  '감사 로그 조회 패턴 분석용 (단일 vs 대량 조회)';


-- ==========================================
-- 2. hospitals 테이블: ARRAY 타입 명확화
-- ==========================================

-- tags: text[] + 기본값 '{}'
DO $$ 
BEGIN
  -- 컬럼이 이미 존재하는지 확인 후 타입 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'tags'
  ) THEN
    -- 기존 데이터 보존하며 text[]로 변환
    ALTER TABLE public.hospitals 
      ALTER COLUMN tags TYPE text[] 
      USING CASE 
        WHEN tags IS NULL THEN '{}'::text[]
        ELSE tags::text[]
      END;
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN tags SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN tags SET NOT NULL;
  ELSE
    -- 컬럼이 없으면 생성
    ALTER TABLE public.hospitals 
      ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- images: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'images'
  ) THEN
    ALTER TABLE public.hospitals 
      ALTER COLUMN images TYPE text[] 
      USING CASE 
        WHEN images IS NULL THEN '{}'::text[]
        ELSE images::text[]
      END;
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN images SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN images SET NOT NULL;
  ELSE
    ALTER TABLE public.hospitals 
      ADD COLUMN images text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- supported_languages: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'supported_languages'
  ) THEN
    ALTER TABLE public.hospitals 
      ALTER COLUMN supported_languages TYPE text[] 
      USING CASE 
        WHEN supported_languages IS NULL THEN '{}'::text[]
        ELSE supported_languages::text[]
      END;
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN supported_languages SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN supported_languages SET NOT NULL;
  ELSE
    ALTER TABLE public.hospitals 
      ADD COLUMN supported_languages text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- amenities: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hospitals' AND column_name = 'amenities'
  ) THEN
    ALTER TABLE public.hospitals 
      ALTER COLUMN amenities TYPE text[] 
      USING CASE 
        WHEN amenities IS NULL THEN '{}'::text[]
        ELSE amenities::text[]
      END;
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN amenities SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.hospitals 
      ALTER COLUMN amenities SET NOT NULL;
  ELSE
    ALTER TABLE public.hospitals 
      ADD COLUMN amenities text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- 인덱스 생성 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_hospitals_tags_gin 
  ON public.hospitals USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_hospitals_supported_languages_gin 
  ON public.hospitals USING GIN(supported_languages);

COMMENT ON COLUMN public.hospitals.tags IS 'Hospital tags (text[], never null)';
COMMENT ON COLUMN public.hospitals.images IS 'Hospital image URLs (text[], never null)';
COMMENT ON COLUMN public.hospitals.supported_languages IS 'Supported languages (text[], never null)';
COMMENT ON COLUMN public.hospitals.amenities IS 'Hospital amenities (text[], never null)';


-- ==========================================
-- 3. treatments 테이블: ARRAY 타입 명확화
-- ==========================================

-- tags: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatments' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.treatments 
      ALTER COLUMN tags TYPE text[] 
      USING CASE 
        WHEN tags IS NULL THEN '{}'::text[]
        ELSE tags::text[]
      END;
    
    ALTER TABLE public.treatments 
      ALTER COLUMN tags SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.treatments 
      ALTER COLUMN tags SET NOT NULL;
  ELSE
    ALTER TABLE public.treatments 
      ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- images: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatments' AND column_name = 'images'
  ) THEN
    ALTER TABLE public.treatments 
      ALTER COLUMN images TYPE text[] 
      USING CASE 
        WHEN images IS NULL THEN '{}'::text[]
        ELSE images::text[]
      END;
    
    ALTER TABLE public.treatments 
      ALTER COLUMN images SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.treatments 
      ALTER COLUMN images SET NOT NULL;
  ELSE
    ALTER TABLE public.treatments 
      ADD COLUMN images text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- benefits: text[] + 기본값 '{}'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'treatments' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE public.treatments 
      ALTER COLUMN benefits TYPE text[] 
      USING CASE 
        WHEN benefits IS NULL THEN '{}'::text[]
        ELSE benefits::text[]
      END;
    
    ALTER TABLE public.treatments 
      ALTER COLUMN benefits SET DEFAULT '{}'::text[];
    
    ALTER TABLE public.treatments 
      ALTER COLUMN benefits SET NOT NULL;
  ELSE
    ALTER TABLE public.treatments 
      ADD COLUMN benefits text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- 인덱스 생성 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_treatments_tags_gin 
  ON public.treatments USING GIN(tags);

COMMENT ON COLUMN public.treatments.tags IS 'Treatment tags (text[], never null)';
COMMENT ON COLUMN public.treatments.images IS 'Treatment image URLs (text[], never null)';
COMMENT ON COLUMN public.treatments.benefits IS 'Treatment benefits (text[], never null)';


-- ==========================================
-- 4. normalized_inquiries: missing_fields 타입 명확화
-- ==========================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'normalized_inquiries' AND column_name = 'missing_fields'
  ) THEN
    ALTER TABLE public.normalized_inquiries 
      ALTER COLUMN missing_fields TYPE text[] 
      USING CASE 
        WHEN missing_fields IS NULL THEN '{}'::text[]
        ELSE missing_fields::text[]
      END;
    
    ALTER TABLE public.normalized_inquiries 
      ALTER COLUMN missing_fields SET DEFAULT '{}'::text[];
  ELSE
    ALTER TABLE public.normalized_inquiries 
      ADD COLUMN missing_fields text[] DEFAULT '{}'::text[];
  END IF;
END $$;

COMMENT ON COLUMN public.normalized_inquiries.missing_fields IS 'Missing intake fields (text[], nullable for backward compat)';


-- ==========================================
-- 5. inquiries.attachment DEPRECATED 처리
-- ==========================================

-- attachment 컬럼을 deprecated로 표시 (삭제하지 않고 보존)
-- 이유: 
--   - 기존 데이터 보존
--   - attachments JSONB로 마이그레이션 완료 (20260125_inquiries_public_token_and_attachments.sql)
--   - 애플리케이션 코드는 attachments만 사용하도록 수정 필요

COMMENT ON COLUMN public.inquiries.attachment IS 
  '[DEPRECATED] Single attachment path. Use attachments (jsonb) instead. Will be removed in future version.';

-- 향후 제거 대비: attachment 컬럼이 NULL이 아닌 경우 경고
-- (현재는 주석 처리, 필요시 활성화)
-- DO $$
-- DECLARE
--   deprecated_count INT;
-- BEGIN
--   SELECT COUNT(*) INTO deprecated_count 
--   FROM public.inquiries 
--   WHERE attachment IS NOT NULL 
--     AND attachment <> ''
--     AND (attachments IS NULL OR attachments = '[]'::jsonb);
--   
--   IF deprecated_count > 0 THEN
--     RAISE WARNING 'Found % inquiries with attachment but empty attachments. Consider backfill.', deprecated_count;
--   END IF;
-- END $$;


-- ==========================================
-- 6. normalized_inquiries: 마케팅 추적 컬럼 추가
-- ==========================================

-- utm 파라미터 (UTM 캠페인 추적)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS utm jsonb DEFAULT NULL;

-- landing_path (첫 방문 페이지)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS landing_path text DEFAULT NULL;

-- referrer (유입 경로)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS referrer text DEFAULT NULL;

-- client_meta (브라우저/디바이스 정보)
ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS client_meta jsonb DEFAULT NULL;

-- 인덱스 생성 (분석 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_utm_gin
  ON public.normalized_inquiries USING GIN(utm)
  WHERE utm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_landing_path
  ON public.normalized_inquiries(landing_path)
  WHERE landing_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_normalized_inquiries_referrer
  ON public.normalized_inquiries(referrer)
  WHERE referrer IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN public.normalized_inquiries.utm IS 
  'UTM 파라미터 (jsonb): source, medium, campaign, term, content';

COMMENT ON COLUMN public.normalized_inquiries.landing_path IS 
  '첫 방문 페이지 경로 (예: /treatments/botox)';

COMMENT ON COLUMN public.normalized_inquiries.referrer IS 
  '유입 출처 URL (예: https://google.com/search?q=...)';

COMMENT ON COLUMN public.normalized_inquiries.client_meta IS 
  '클라이언트 메타데이터 (jsonb): userAgent, device, browser, os 등';


-- ==========================================
-- 7. 검증 쿼리 (주석 처리, 필요시 실행)
-- ==========================================

-- -- admin_audit_logs 타입 확인
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'admin_audit_logs' AND column_name = 'inquiry_ids';
-- -- 예상: data_type = 'ARRAY', udt_name = '_int8'

-- -- hospitals ARRAY 컬럼 타입 확인
-- SELECT column_name, data_type, udt_name, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'hospitals' 
--   AND column_name IN ('tags', 'images', 'supported_languages', 'amenities')
-- ORDER BY column_name;
-- -- 예상: udt_name = '_text', is_nullable = 'NO', column_default = '{}'::text[]

-- -- treatments ARRAY 컬럼 타입 확인
-- SELECT column_name, data_type, udt_name, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'treatments' 
--   AND column_name IN ('tags', 'images', 'benefits')
-- ORDER BY column_name;
-- -- 예상: udt_name = '_text', is_nullable = 'NO', column_default = '{}'::text[]

-- -- normalized_inquiries 신규 컬럼 확인
-- SELECT column_name, data_type, udt_name, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'normalized_inquiries' 
--   AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta', 'missing_fields')
-- ORDER BY column_name;

-- -- inquiries.attachment deprecated 확인
-- SELECT 
--   obj_description(('"public"."inquiries"'::regclass::oid), 'pg_class') as table_comment,
--   col_description(('"public"."inquiries"'::regclass::oid), 
--     (SELECT attnum FROM pg_attribute 
--      WHERE attrelid = '"public"."inquiries"'::regclass AND attname = 'attachment')) as attachment_comment;


-- ==========================================
-- 완료
-- ==========================================

-- ==========================================
-- 8. inquiries.attachments NULL 정리 + NOT NULL 강제
-- ==========================================

-- 기존 NULL 값을 빈 배열로 변환
UPDATE public.inquiries
SET attachments = '[]'::jsonb
WHERE attachments IS NULL;

-- NOT NULL 제약 조건 추가 및 기본값 설정
ALTER TABLE public.inquiries
  ALTER COLUMN attachments SET DEFAULT '[]'::jsonb,
  ALTER COLUMN attachments SET NOT NULL;

COMMENT ON COLUMN public.inquiries.attachments IS 
  'Multiple attachments (jsonb array, never null). Use this instead of deprecated attachment column.';


-- ==========================================
-- 9. hospitals.specialties null 치환 + default/not null
-- ==========================================

-- 기존 NULL 값을 빈 배열로 변환
UPDATE public.hospitals
SET specialties = '{}'::text[]
WHERE specialties IS NULL;

-- 기본값 설정 및 NOT NULL 제약 조건 추가
ALTER TABLE public.hospitals
  ALTER COLUMN specialties SET DEFAULT '{}'::text[],
  ALTER COLUMN specialties SET NOT NULL;

-- 인덱스 생성 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_hospitals_specialties_gin 
  ON public.hospitals USING GIN(specialties);

COMMENT ON COLUMN public.hospitals.specialties IS 
  'Hospital specialties/departments (text[], never null)';


-- ==========================================
-- 10. treatments.tags null 치환 + default/not null
-- ==========================================

-- 기존 NULL 값을 빈 배열로 변환
UPDATE public.treatments
SET tags = '{}'::text[]
WHERE tags IS NULL;

-- 기본값 설정 및 NOT NULL 제약 조건 추가
ALTER TABLE public.treatments
  ALTER COLUMN tags SET DEFAULT '{}'::text[],
  ALTER COLUMN tags SET NOT NULL;


-- ==========================================
-- 완료 및 검증
-- ==========================================

-- 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'P0 DB Schema Refinement completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ admin_audit_logs.inquiry_ids: optimized indexes';
  RAISE NOTICE '  ✅ hospitals: tags, images, supported_languages, amenities, specialties → text[] NOT NULL';
  RAISE NOTICE '  ✅ treatments: tags, images, benefits → text[] NOT NULL';
  RAISE NOTICE '  ✅ normalized_inquiries: missing_fields → text[], added utm/landing_path/referrer/client_meta';
  RAISE NOTICE '  ✅ inquiries.attachment: marked as DEPRECATED';
  RAISE NOTICE '  ✅ inquiries.attachments: → jsonb NOT NULL';
  RAISE NOTICE '  ✅ PATCH: hospitals.specialties, treatments.tags → NULL cleanup + NOT NULL enforced';
  RAISE NOTICE '========================================';
END $$;


-- ==========================================
-- 검증 쿼리 (마이그레이션 실행 후 별도로 실행)
-- ==========================================

-- 1️⃣ inquiries.attachments: NULL 값 없는지 확인
-- SELECT 
--   'inquiries.attachments NULL check' as test_name,
--   COUNT(*) as total_rows,
--   COUNT(*) FILTER (WHERE attachments IS NULL) as null_count,
--   COUNT(*) FILTER (WHERE attachments = '[]'::jsonb) as empty_array_count,
--   CASE 
--     WHEN COUNT(*) FILTER (WHERE attachments IS NULL) = 0 THEN '✅ PASS'
--     ELSE '❌ FAIL: NULL values found'
--   END as status
-- FROM public.inquiries;

-- 2️⃣ hospitals.specialties: NULL 값 없는지 확인
-- SELECT 
--   'hospitals.specialties NULL check' as test_name,
--   COUNT(*) as total_rows,
--   COUNT(*) FILTER (WHERE specialties IS NULL) as null_count,
--   COUNT(*) FILTER (WHERE specialties = '{}'::text[]) as empty_array_count,
--   CASE 
--     WHEN COUNT(*) FILTER (WHERE specialties IS NULL) = 0 THEN '✅ PASS'
--     ELSE '❌ FAIL: NULL values found'
--   END as status
-- FROM public.hospitals;

-- 3️⃣ 컬럼 메타데이터 확인: default 값 및 nullable 상태
-- SELECT 
--   table_name,
--   column_name,
--   data_type,
--   udt_name,
--   is_nullable,
--   column_default,
--   CASE 
--     WHEN is_nullable = 'NO' AND (column_default LIKE '%{}%' OR column_default LIKE '%[]%') THEN '✅ NOT NULL + default'
--     WHEN column_name IN ('utm', 'landing_path', 'referrer', 'client_meta', 'missing_fields') THEN '✅ nullable (OK)'
--     WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
--     ELSE '⚠️ CHECK'
--   END as validation_status
-- FROM information_schema.columns
-- WHERE table_name IN ('inquiries', 'hospitals', 'treatments', 'normalized_inquiries')
--   AND column_name IN (
--     'attachments',           -- inquiries
--     'specialties',           -- hospitals
--     'tags', 'images', 'amenities', 'supported_languages',  -- hospitals
--     'benefits',              -- treatments
--     'missing_fields', 'utm', 'landing_path', 'referrer', 'client_meta'  -- normalized_inquiries
--   )
-- ORDER BY table_name, column_name;
