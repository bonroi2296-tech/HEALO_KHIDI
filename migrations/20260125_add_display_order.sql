-- HEALO: 메인 페이지 카드 순서 지정 기능 추가
-- treatments와 hospitals 테이블에 display_order 컬럼 추가

-- ==========================================
-- 1. treatments 테이블에 display_order 추가
-- ==========================================

-- display_order 컬럼 추가 (NULL 허용, 기본값 NULL)
ALTER TABLE public.treatments 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 기존 레코드에 순서 부여 (created_at 기준 역순으로 1부터 시작)
UPDATE public.treatments
SET display_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num
  FROM public.treatments
  WHERE display_order IS NULL
) AS sub
WHERE public.treatments.id = sub.id;

-- 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS treatments_display_order_idx 
ON public.treatments(display_order NULLS LAST);

-- ==========================================
-- 2. hospitals 테이블에 display_order 추가
-- ==========================================

-- display_order 컬럼 추가 (NULL 허용, 기본값 NULL)
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 기존 레코드에 순서 부여 (created_at 기준 역순으로 1부터 시작)
UPDATE public.hospitals
SET display_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num
  FROM public.hospitals
  WHERE display_order IS NULL
) AS sub
WHERE public.hospitals.id = sub.id;

-- 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS hospitals_display_order_idx 
ON public.hospitals(display_order NULLS LAST);

-- ==========================================
-- 3. 확인용 쿼리
-- ==========================================

-- treatments 확인
SELECT id, name, display_order, created_at
FROM public.treatments
ORDER BY display_order NULLS LAST, created_at DESC
LIMIT 10;

-- hospitals 확인
SELECT id, name, display_order, created_at
FROM public.hospitals
ORDER BY display_order NULLS LAST, created_at DESC
LIMIT 10;
