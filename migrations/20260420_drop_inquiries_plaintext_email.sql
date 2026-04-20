-- HEALO: inquiries.email 평문 컬럼 제거 마이그레이션
--
-- 생성일: 2026-04-20
-- 전제: encrypted_email (jsonb, AES-256-GCM) 컬럼이 이미 존재하고
--       응용 코드가 전부 encrypted_email 을 사용하도록 전환된 상태.
--
-- ⚠️ 실행 전 반드시 확인:
--   1) 모든 인입 경로에서 inquiries.email 을 더 이상 쓰지 않음
--      (grep "inquiries.email" src app — 하드코딩된 SELECT 없는지)
--   2) 백업 확보 (Supabase Dashboard → Database → Backups)
--   3) 평문 데이터 전부 encrypted_email 로 이관됐는지 아래 SELECT 로 확인
--
-- 롤백: Supabase point-in-time recovery 사용 (컬럼 재생성은 데이터 복구 불가)

BEGIN;

-- Step 1: 안전 검증 — 평문 email 은 있는데 encrypted 는 비어있는 row 탐지
-- 결과가 0 rows 여야 진행 가능
DO $$
DECLARE
  unencrypted_count integer;
BEGIN
  SELECT COUNT(*) INTO unencrypted_count
  FROM public.inquiries
  WHERE email IS NOT NULL
    AND email <> ''
    AND encrypted_email IS NULL;

  IF unencrypted_count > 0 THEN
    RAISE EXCEPTION
      '[ABORT] % rows have plaintext email but NULL encrypted_email. Run re-encryption script FIRST.',
      unencrypted_count;
  END IF;

  RAISE NOTICE 'Safety check passed. All plaintext emails have ciphertext counterparts.';
END $$;

-- Step 2: 의존하는 view / index / function 이 없는지 확인 (있으면 오류)
-- (public 스키마 기준 자동 탐지)
DO $$
DECLARE
  dep_count integer;
BEGIN
  SELECT COUNT(*) INTO dep_count
  FROM pg_depend d
  JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
  JOIN pg_class c ON c.oid = d.refobjid
  WHERE c.relname = 'inquiries'
    AND a.attname = 'email'
    AND d.deptype = 'n';

  IF dep_count > 0 THEN
    RAISE EXCEPTION
      '[ABORT] % dependencies on inquiries.email. Drop them first.',
      dep_count;
  END IF;
END $$;

-- Step 3: DROP
ALTER TABLE public.inquiries DROP COLUMN IF EXISTS email;

-- Step 4: audit log
INSERT INTO public.admin_audit_logs (admin_email, action, metadata, created_at)
VALUES (
  'migration',
  'DROP_COLUMN',
  jsonb_build_object(
    'table', 'inquiries',
    'column', 'email',
    'reason', 'replaced_by_encrypted_email_jsonb',
    'migration_file', '20260420_drop_inquiries_plaintext_email.sql'
  ),
  NOW()
);

COMMIT;

-- 실행 후 확인:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='inquiries' AND column_name LIKE '%email%';
-- → encrypted_email 만 남아야 함
