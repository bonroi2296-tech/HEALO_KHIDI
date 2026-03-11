-- Inquiry Form 제출 후 source_type='inquiry_form' normalized_inquiries 생성 검증
-- 로컬에서 /inquiry 폼 1회 제출 후 Supabase SQL Editor에서 실행

SELECT
  id,
  created_at,
  source_type,
  source_inquiry_id,
  extraction_confidence,
  missing_fields,
  constraints->'intake' AS intake,
  constraints->'meta' AS meta
FROM public.normalized_inquiries
WHERE source_type = 'inquiry_form'
ORDER BY created_at DESC
LIMIT 5;
