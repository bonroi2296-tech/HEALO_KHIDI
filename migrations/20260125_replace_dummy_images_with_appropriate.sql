-- HEALO: 시술/병원 이미지 데이터 개선
-- "immune hospital"은 제외하고 나머지 시술명에 적합한 이미지로 교체
-- ⚠️ images 컬럼 타입: treatments는 text[], hospitals는 jsonb일 수 있음

-- ⚠️ 실행 전 확인용 쿼리 (먼저 실행해서 영향받을 레코드 확인)
-- 시술 확인 (immune-hospital 제외)
SELECT 
  t.id, 
  t.slug, 
  t.name, 
  t.images,
  pg_typeof(t.images) AS images_type,
  h.slug AS hospital_slug,
  h.name AS hospital_name,
  CASE 
    WHEN t.images::text LIKE '%placehold.co%' OR t.images::text LIKE '%placeholder%' THEN '더미 이미지'
    ELSE '정상'
  END AS status
FROM public.treatments t
LEFT JOIN public.hospitals h ON h.id = t.hospital_id
WHERE h.slug != 'immune-hospital'
ORDER BY t.created_at DESC;

-- 병원 확인
SELECT 
  id, 
  slug, 
  name, 
  images,
  pg_typeof(images) AS images_type,
  CASE 
    WHEN images::text LIKE '%placehold.co%' OR images::text LIKE '%placeholder%' THEN '더미 이미지'
    ELSE '정상'
  END AS status
FROM public.hospitals
WHERE slug != 'immune-hospital'
ORDER BY created_at DESC;

-- ==========================================
-- 시술명 기반 이미지 매핑 (시술명에 적합한 이미지로 교체)
-- ==========================================

-- 시술명 패턴 매칭으로 적절한 이미지 URL 할당 (text[] 배열 타입)
UPDATE public.treatments
SET images = CASE
  -- 고주파 온열치료 (Hyperthermia)
  WHEN LOWER(name) LIKE '%hyperthermia%' OR LOWER(name) LIKE '%고주파%' OR LOWER(name) LIKE '%온열%'
    THEN ARRAY['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=600&fit=crop']
  
  -- 안면마비 치료 (Facial Paralysis)
  WHEN LOWER(name) LIKE '%facial paralysis%' OR LOWER(name) LIKE '%안면마비%' OR LOWER(name) LIKE '%facial rehab%'
    THEN ARRAY['https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=600&fit=crop']
  
  -- 수술 후 재활 (Post-op, Rehab)
  WHEN LOWER(name) LIKE '%post-op%' OR LOWER(name) LIKE '%postop%' OR LOWER(name) LIKE '%rehab%' OR LOWER(name) LIKE '%재활%'
    THEN ARRAY['https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1200&h=600&fit=crop']
  
  -- 울테라 리프팅 (Ulthera)
  WHEN LOWER(name) LIKE '%ulthera%' OR LOWER(name) LIKE '%울테라%' OR LOWER(name) LIKE '%lifting%' OR LOWER(name) LIKE '%리프팅%'
    THEN ARRAY['https://images.unsplash.com/photo-1616394584738-fc6e612e0b16?w=1200&h=600&fit=crop']
  
  -- 성형수술 관련 (Plastic Surgery, Rhinoplasty, etc.)
  WHEN LOWER(name) LIKE '%rhinoplasty%' OR LOWER(name) LIKE '%코성형%' OR LOWER(name) LIKE '%nose%'
    THEN ARRAY['https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&h=600&fit=crop']
  
  WHEN LOWER(name) LIKE '%anti-aging%' OR LOWER(name) LIKE '%안티에이징%' OR LOWER(name) LIKE '%antiaging%'
    THEN ARRAY['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1200&h=600&fit=crop']
  
  WHEN LOWER(name) LIKE '%facial contour%' OR LOWER(name) LIKE '%안면윤곽%'
    THEN ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop']
  
  -- 피부 관련 (Skin, Acne, etc.)
  WHEN LOWER(name) LIKE '%acne%' OR LOWER(name) LIKE '%여드름%' OR LOWER(name) LIKE '%skin%' OR LOWER(name) LIKE '%피부%'
    THEN ARRAY['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1200&h=600&fit=crop']
  
  -- 치과 관련 (Dental)
  WHEN LOWER(name) LIKE '%dental%' OR LOWER(name) LIKE '%치과%' OR LOWER(name) LIKE '%tooth%' OR LOWER(name) LIKE '%이빨%'
    THEN ARRAY['https://images.unsplash.com/photo-1606811971618-4486c4f48e15?w=1200&h=600&fit=crop']
  
  -- 안과 관련 (Eye, Vision)
  WHEN LOWER(name) LIKE '%eye%' OR LOWER(name) LIKE '%vision%' OR LOWER(name) LIKE '%안과%' OR LOWER(name) LIKE '%눈%'
    THEN ARRAY['https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&h=600&fit=crop']
  
  -- 체형 관리 (Body, Weight)
  WHEN LOWER(name) LIKE '%body%' OR LOWER(name) LIKE '%weight%' OR LOWER(name) LIKE '%체형%' OR LOWER(name) LIKE '%다이어트%'
    THEN ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop']
  
  -- 통증 관리 (Pain, Joint)
  WHEN LOWER(name) LIKE '%pain%' OR LOWER(name) LIKE '%joint%' OR LOWER(name) LIKE '%통증%' OR LOWER(name) LIKE '%관절%'
    THEN ARRAY['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=600&fit=crop']
  
  -- 기본값: 의료 시설 이미지
  ELSE ARRAY['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop']
END
WHERE (SELECT slug FROM public.hospitals WHERE id = treatments.hospital_id) != 'immune-hospital'
  AND (
    images::text LIKE '%placehold.co%'
    OR images::text LIKE '%placeholder%'
  );

-- 병원 이미지도 적절한 이미지로 교체
-- ⚠️ hospitals.images가 jsonb 타입이면 아래 주석 해제하고 위 UPDATE는 주석 처리
-- UPDATE public.hospitals
-- SET images = CASE
--   WHEN LOWER(name) LIKE '%plastic%' OR LOWER(name) LIKE '%성형%'
--     THEN '["https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&h=600&fit=crop"]'::jsonb
--   WHEN LOWER(name) LIKE '%dental%' OR LOWER(name) LIKE '%치과%'
--     THEN '["https://images.unsplash.com/photo-1606811971618-4486c4f48e15?w=1200&h=600&fit=crop"]'::jsonb
--   WHEN LOWER(name) LIKE '%eye%' OR LOWER(name) LIKE '%안과%'
--     THEN '["https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&h=600&fit=crop"]'::jsonb
--   ELSE '["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop"]'::jsonb
-- END
-- WHERE slug != 'immune-hospital'
--   AND (
--     images::text LIKE '%placehold.co%'
--     OR images::text LIKE '%placeholder%'
--   );

-- ⚠️ hospitals.images가 text[] 타입이면 아래 사용
UPDATE public.hospitals
SET images = CASE
  WHEN LOWER(name) LIKE '%plastic%' OR LOWER(name) LIKE '%성형%'
    THEN ARRAY['https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&h=600&fit=crop']
  WHEN LOWER(name) LIKE '%dental%' OR LOWER(name) LIKE '%치과%'
    THEN ARRAY['https://images.unsplash.com/photo-1606811971618-4486c4f48e15?w=1200&h=600&fit=crop']
  WHEN LOWER(name) LIKE '%eye%' OR LOWER(name) LIKE '%안과%'
    THEN ARRAY['https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&h=600&fit=crop']
  ELSE ARRAY['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&h=600&fit=crop']
END
WHERE slug != 'immune-hospital'
  AND (
    images::text LIKE '%placehold.co%'
    OR images::text LIKE '%placeholder%'
  );

-- ==========================================
-- 업데이트 후 확인
-- ==========================================

SELECT 
  t.id, 
  t.slug, 
  t.name, 
  t.images,
  h.slug AS hospital_slug,
  h.name AS hospital_name
FROM public.treatments t
LEFT JOIN public.hospitals h ON h.id = t.hospital_id
WHERE h.slug != 'immune-hospital'
ORDER BY t.created_at DESC;

SELECT 
  id, 
  slug, 
  name, 
  images
FROM public.hospitals
WHERE slug != 'immune-hospital'
ORDER BY created_at DESC;
