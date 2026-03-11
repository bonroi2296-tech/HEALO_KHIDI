-- HEALO IntakeSchema 검증용 SQL
-- normalized_inquiries.constraints.intake / meta 적재 확인

-- 1) 최신 5개 row에서 constraints.intake 키 존재 여부 확인
SELECT
  id,
  created_at,
  source_type,
  raw_message IS NOT NULL AS has_raw_message,
  constraints ? 'intake' AS has_intake_key,
  constraints ? 'meta' AS has_meta_key,
  constraints->'intake' IS NOT NULL AS intake_not_null,
  constraints->'meta'->>'pipeline_version' AS meta_pipeline_version,
  constraints->'meta'->>'source_type' AS meta_source_type,
  extraction_confidence,
  missing_fields
FROM public.normalized_inquiries
ORDER BY created_at DESC
LIMIT 5;

-- 2) source_type별(ai_agent vs inquiry_form) 누락필드/신뢰도 비교
SELECT
  source_type,
  COUNT(*) AS cnt,
  ROUND(AVG(extraction_confidence)::numeric, 2) AS avg_confidence,
  ROUND(AVG(COALESCE(array_length(COALESCE(missing_fields, '{}'), 1), 0))::numeric, 1) AS avg_missing_count,
  COUNT(*) FILTER (WHERE constraints ? 'intake' AND constraints->'intake' IS NOT NULL) AS with_intake,
  COUNT(*) FILTER (WHERE constraints ? 'meta') AS with_meta
FROM public.normalized_inquiries
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY source_type
ORDER BY source_type;
