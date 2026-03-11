-- ========================================
-- 알림 테이블 존재 확인 스크립트
-- ========================================
-- Supabase SQL Editor에서 실행하세요.

-- 1. admin_notification_recipients 테이블 존재 확인
SELECT 
  'admin_notification_recipients' AS table_name,
  EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_notification_recipients'
  ) AS exists,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'admin_notification_recipients'
    ) THEN '✅ 테이블 존재함'
    ELSE '❌ 테이블 없음 - migrations/20260129_add_admin_notification_recipients.sql 실행 필요'
  END AS status;

-- 2. admin_notification_logs 테이블 존재 확인
SELECT 
  'admin_notification_logs' AS table_name,
  EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_notification_logs'
  ) AS exists,
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'admin_notification_logs'
    ) THEN '✅ 테이블 존재함'
    ELSE '❌ 테이블 없음 - migrations/20260204_add_admin_notification_logs.sql 실행 필요'
  END AS status;

-- 3. 테이블이 있다면 컬럼 구조 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('admin_notification_recipients', 'admin_notification_logs')
ORDER BY table_name, ordinal_position;
