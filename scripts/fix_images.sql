-- HEALO: 시술/병원 이미지 데이터 수정 스크립트
-- "immune hospital"은 제외하고 나머지 이미지를 정리

-- 1. 현재 데이터 확인
SELECT 
  id, 
  slug, 
  name, 
  images,
  CASE 
    WHEN slug = 'immune-hospital' THEN 'EXCLUDE'
    ELSE 'UPDATE'
  END AS action
FROM public.hospitals
ORDER BY created_at DESC;

SELECT 
  id, 
  slug, 
  name, 
  images,
  hospital_id,
  CASE 
    WHEN (SELECT slug FROM public.hospitals WHERE id = treatments.hospital_id) = 'immune-hospital' THEN 'EXCLUDE'
    ELSE 'UPDATE'
  END AS action
FROM public.treatments
ORDER BY created_at DESC;

-- 2. placehold.co 이미지가 있는 레코드 찾기
SELECT 
  id, 
  slug, 
  name, 
  images
FROM public.hospitals
WHERE slug != 'immune-hospital'
  AND (
    images::text LIKE '%placehold.co%'
    OR images::text LIKE '%placeholder%'
    OR images::text LIKE '%unsplash.com%'
  )
ORDER BY created_at DESC;

SELECT 
  id, 
  slug, 
  name, 
  images
FROM public.treatments
WHERE (SELECT slug FROM public.hospitals WHERE id = treatments.hospital_id) != 'immune-hospital'
  AND (
    images::text LIKE '%placehold.co%'
    OR images::text LIKE '%placeholder%'
    OR images::text LIKE '%unsplash.com%'
  )
ORDER BY created_at DESC;

-- 3. 이미지 배열을 빈 배열로 초기화 (placehold.co 등 더미 이미지 제거)
-- 주의: 실제 이미지가 있는 경우는 수동으로 확인 필요

-- UPDATE public.hospitals
-- SET images = '[]'::jsonb
-- WHERE slug != 'immune-hospital'
--   AND (
--     images::text LIKE '%placehold.co%'
--     OR images::text LIKE '%placeholder%'
--   );

-- UPDATE public.treatments
-- SET images = '[]'::jsonb
-- WHERE (SELECT slug FROM public.hospitals WHERE id = treatments.hospital_id) != 'immune-hospital'
--   AND (
--     images::text LIKE '%placehold.co%'
--     OR images::text LIKE '%placeholder%'
--   );
