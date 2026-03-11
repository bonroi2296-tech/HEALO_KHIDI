-- HEALO: 프론트 노출 여부 제어 필드 추가
-- treatments와 hospitals 테이블에 is_published 컬럼 추가

-- ==========================================
-- 1. treatments 테이블에 is_published 추가
-- ==========================================

ALTER TABLE public.treatments 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- 기존 레코드는 모두 published로 설정
UPDATE public.treatments
SET is_published = true
WHERE is_published IS NULL;

-- 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS treatments_is_published_idx 
ON public.treatments(is_published);

-- ==========================================
-- 2. hospitals 테이블에 is_published 추가
-- ==========================================

ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- 기존 레코드는 모두 published로 설정
UPDATE public.hospitals
SET is_published = true
WHERE is_published IS NULL;

-- 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS hospitals_is_published_idx 
ON public.hospitals(is_published);

-- ==========================================
-- 3. 확인용 쿼리
-- ==========================================

-- treatments 확인
SELECT id, name, is_published, display_order
FROM public.treatments
ORDER BY display_order NULLS LAST, created_at DESC
LIMIT 10;

-- hospitals 확인
SELECT id, name, is_published, display_order
FROM public.hospitals
ORDER BY display_order NULLS LAST, created_at DESC
LIMIT 10;
