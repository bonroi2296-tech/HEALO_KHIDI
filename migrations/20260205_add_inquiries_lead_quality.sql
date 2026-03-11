-- ============================================
-- HEALO: inquiries 테이블 리드 품질 컬럼 추가
-- ============================================
-- 목적: 리드 자동 평가 및 우선순위 관리
-- 날짜: 2026-02-05
-- 출처: migrations/20260129_add_lead_quality_and_events.sql
-- 실행: Supabase SQL Editor
-- ============================================

-- ==========================================
-- 1️⃣ 사전 검증: 현재 컬럼 존재 여부 확인
-- ==========================================

SELECT 
  'inquiries 테이블 리드 품질 컬럼 확인' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
  AND column_name IN ('lead_quality', 'priority_score', 'lead_tags', 'quality_signals', 'quality_evaluated_at')
ORDER BY column_name;

-- 예상: 0 rows (컬럼 없음) → 아래 마이그레이션 실행 필요
-- 예상: 5 rows (컬럼 있음) → 이미 적용됨, 실행 불필요


-- ==========================================
-- 2️⃣ 컬럼 추가
-- ==========================================

-- 리드 품질 등급
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS lead_quality TEXT 
CHECK (lead_quality IN ('hot', 'warm', 'cold', 'spam'));

-- 우선순위 점수 (0-100)
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS priority_score INTEGER 
CHECK (priority_score >= 0 AND priority_score <= 100);

-- 리드 태그 (JSON 배열)
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS lead_tags JSONB;

-- 품질 시그널 (JSON 배열)
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS quality_signals JSONB;

-- 품질 평가 시각
ALTER TABLE public.inquiries 
ADD COLUMN IF NOT EXISTS quality_evaluated_at TIMESTAMPTZ;

-- 코멘트
COMMENT ON COLUMN public.inquiries.lead_quality IS '리드 품질: hot(긴급), warm(중요), cold(낮음), spam(스팸)';
COMMENT ON COLUMN public.inquiries.priority_score IS '우선순위 점수 (0-100, 높을수록 우선)';
COMMENT ON COLUMN public.inquiries.lead_tags IS '자동 부여된 태그 배열 (예: ["high-value-country", "complete-profile"])';
COMMENT ON COLUMN public.inquiries.quality_signals IS '품질 시그널 배열 (예: ["Target country: KR", "Premium treatment"])';
COMMENT ON COLUMN public.inquiries.quality_evaluated_at IS '품질 평가 수행 시각';


-- ==========================================
-- 3️⃣ 인덱스 추가 (운영 조회 성능)
-- ==========================================

-- lead_quality 기준 필터링 (hot/warm 우선 처리)
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_quality 
ON public.inquiries(lead_quality)
WHERE lead_quality IS NOT NULL;

-- priority_score 정렬 (높은 점수 우선)
CREATE INDEX IF NOT EXISTS idx_inquiries_priority_score 
ON public.inquiries(priority_score DESC) 
WHERE priority_score IS NOT NULL;

-- 복합 인덱스: lead_quality + created_at (운영 대시보드용)
CREATE INDEX IF NOT EXISTS idx_inquiries_quality_created 
ON public.inquiries(lead_quality, created_at DESC) 
WHERE lead_quality IS NOT NULL;


-- ==========================================
-- 4️⃣ 검증: 컬럼이 제대로 추가되었는지 확인
-- ==========================================

SELECT 
  '✅ inquiries 리드 품질 컬럼 추가 완료' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
  AND column_name IN ('lead_quality', 'priority_score', 'lead_tags', 'quality_signals', 'quality_evaluated_at')
ORDER BY column_name;

-- 예상 결과: 5 rows
-- lead_quality            | text        | YES | NULL
-- priority_score          | integer     | YES | NULL
-- lead_tags               | jsonb       | YES | NULL
-- quality_signals         | jsonb       | YES | NULL
-- quality_evaluated_at    | timestamptz | YES | NULL


-- 인덱스 확인
SELECT 
  '✅ inquiries 인덱스 확인' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'inquiries'
  AND indexname LIKE 'idx_inquiries_%quality%'
ORDER BY indexname;

-- 예상 결과: 2-3 rows


-- ==========================================
-- 5️⃣ 샘플 UPDATE 테스트 (DRY RUN)
-- ==========================================

-- 테스트용 트랜잭션 (실제 적용 안됨, 검증만)
DO $$
DECLARE
  test_id bigint;  -- inquiries.id는 bigint 타입
BEGIN
  -- 랜덤 inquiry 1건 선택
  SELECT id INTO test_id 
  FROM public.inquiries 
  LIMIT 1;
  
  IF test_id IS NOT NULL THEN
    -- 샘플 UPDATE (실제 커밋 안됨)
    BEGIN
      UPDATE public.inquiries
      SET 
        lead_quality = 'warm',
        priority_score = 60,
        lead_tags = '["test-tag"]'::jsonb,
        quality_signals = '["Sample signal"]'::jsonb,
        quality_evaluated_at = NOW()
      WHERE id = test_id;
      
      RAISE NOTICE '✅ 샘플 UPDATE 테스트 성공: ID %', test_id;
      RAISE EXCEPTION 'ROLLBACK (테스트용)'; -- 롤백
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 롤백됨 (의도된 동작)';
    END;
  ELSE
    RAISE NOTICE '⚠️ inquiries 테이블이 비어있음';
  END IF;
END $$;


-- ==========================================
-- 6️⃣ 완료 로그
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ inquiries 리드 품질 컬럼 마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ inquiries: lead_quality, priority_score, lead_tags, quality_signals, quality_evaluated_at 추가';
  RAISE NOTICE '  ✅ 모든 컬럼 nullable (기존 데이터 영향 없음)';
  RAISE NOTICE '  ✅ 인덱스 생성 완료 (운영 쿼리 최적화)';
  RAISE NOTICE '  ✅ CHECK constraint 추가 (데이터 무결성 보장)';
  RAISE NOTICE '========================================';
END $$;
