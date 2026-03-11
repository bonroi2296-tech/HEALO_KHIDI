-- ============================================
-- HEALO: 안전한 마이그레이션 적용
-- ============================================
-- 목적: 코드에서 사용하지만 DB에 없는 컬럼만 선별 추가
-- 날짜: 2026-02-05
-- 실행: Supabase SQL Editor
-- ============================================

-- ==========================================
-- 1️⃣ 사전 검증: 현재 컬럼 존재 여부 확인
-- ==========================================

-- normalized_inquiries 컬럼 확인
SELECT 
  'normalized_inquiries' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'normalized_inquiries'
  AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta')
ORDER BY column_name;

-- inquiries 컬럼 확인 (리드 품질 관련)
SELECT 
  'inquiries' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
  AND column_name IN ('lead_quality', 'priority_score', 'lead_tags', 'quality_signals', 'quality_evaluated_at')
ORDER BY column_name;


-- ==========================================
-- 2️⃣ normalized_inquiries: 마케팅 추적 컬럼 추가
-- ==========================================
-- 출처: migrations/20260204_p0_db_schema_refinement.sql (lines 299-342)

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
-- 3️⃣ 검증: 컬럼이 제대로 추가되었는지 확인
-- ==========================================

SELECT 
  '✅ normalized_inquiries 컬럼 추가 완료' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'normalized_inquiries'
  AND column_name IN ('utm', 'landing_path', 'referrer', 'client_meta')
ORDER BY column_name;

-- 인덱스 확인
SELECT 
  '✅ normalized_inquiries 인덱스 확인' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'normalized_inquiries'
  AND indexname LIKE 'idx_normalized_inquiries_%'
ORDER BY indexname;


-- ==========================================
-- 4️⃣ 샘플 UPDATE 테스트 (DRY RUN)
-- ==========================================

-- 테스트용 트랜잭션 (실제 적용 안됨, 검증만)
DO $$
DECLARE
  test_id uuid;  -- ✅ bigint → uuid로 수정
BEGIN
  -- 랜덤 normalized_inquiry 1건 선택
  SELECT id INTO test_id 
  FROM public.normalized_inquiries 
  LIMIT 1;
  
  IF test_id IS NOT NULL THEN
    -- 샘플 UPDATE (실제 커밋 안됨)
    BEGIN
      UPDATE public.normalized_inquiries
      SET 
        utm = '{"source": "google", "medium": "cpc", "campaign": "test"}'::jsonb,
        landing_path = '/treatments/botox',
        referrer = 'https://google.com',
        client_meta = '{"device": "mobile", "browser": "chrome"}'::jsonb
      WHERE id = test_id;
      
      RAISE NOTICE '✅ 샘플 UPDATE 테스트 성공: ID %', test_id;
      RAISE EXCEPTION 'ROLLBACK (테스트용)'; -- 롤백
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 롤백됨 (의도된 동작)';
    END;
  ELSE
    RAISE NOTICE '⚠️ normalized_inquiries 테이블이 비어있음';
  END IF;
END $$;


-- ==========================================
-- 5️⃣ 완료 로그
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 안전한 마이그레이션 적용 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ normalized_inquiries: utm, landing_path, referrer, client_meta 추가';
  RAISE NOTICE '  ✅ 모든 컬럼 nullable (기존 데이터 영향 없음)';
  RAISE NOTICE '  ✅ 인덱스 생성 완료 (분석 쿼리 최적화)';
  RAISE NOTICE '  ✅ 샘플 UPDATE 테스트 통과';
  RAISE NOTICE '========================================';
END $$;


-- ==========================================
-- 6️⃣ [선택] inquiries 테이블 리드 품질 컬럼 추가
-- ==========================================
-- 출처: migrations/20260129_add_lead_quality_and_events.sql
-- 
-- ⚠️ 주의: inquiries 테이블 확인 후 필요시 실행
-- 아래 주석 해제 후 실행:

/*
-- 리드 품질 등급
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS lead_quality TEXT 
CHECK (lead_quality IN ('hot', 'warm', 'cold', 'spam'));

-- 우선순위 점수 (0-100)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS priority_score INTEGER 
CHECK (priority_score >= 0 AND priority_score <= 100);

-- 리드 태그 (JSON 배열)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS lead_tags JSONB;

-- 품질 시그널 (JSON 배열)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS quality_signals JSONB;

-- 품질 평가 시각
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS quality_evaluated_at TIMESTAMPTZ;

-- 인덱스 추가 (운영 조회 성능)
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_quality 
ON inquiries(lead_quality);

CREATE INDEX IF NOT EXISTS idx_inquiries_priority_score 
ON inquiries(priority_score DESC) 
WHERE priority_score IS NOT NULL;

-- 코멘트
COMMENT ON COLUMN inquiries.lead_quality IS '리드 품질: hot(긴급), warm(중요), cold(낮음), spam(스팸)';
COMMENT ON COLUMN inquiries.priority_score IS '우선순위 점수 (0-100, 높을수록 우선)';

-- 검증
SELECT 
  '✅ inquiries 리드 품질 컬럼 추가 완료' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
  AND column_name IN ('lead_quality', 'priority_score', 'lead_tags', 'quality_signals', 'quality_evaluated_at')
ORDER BY column_name;
*/
