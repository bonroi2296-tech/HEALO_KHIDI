-- ============================================
-- HEALO: admin_audit_logs.inquiry_ids → bigint[]
-- ============================================
-- 목적: int4[] → bigint[] (향후 ID 범위 확장 대비)
-- 날짜: 2026-01-30
-- ============================================

-- inquiry_ids 타입을 bigint[]로 변경
ALTER TABLE public.admin_audit_logs
  ALTER COLUMN inquiry_ids
  TYPE bigint[]
  USING inquiry_ids::bigint[];

-- 검증 쿼리 (선택)
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'admin_audit_logs' AND column_name = 'inquiry_ids';
-- 예상: udt_name = '_int8'

COMMENT ON COLUMN public.admin_audit_logs.inquiry_ids IS 
  'inquiry ID 배열 (bigint[]) - public.inquiries.id 참조';
