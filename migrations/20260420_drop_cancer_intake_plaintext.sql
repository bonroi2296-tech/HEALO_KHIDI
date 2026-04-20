-- HEALO: cancer_patient_intakes 평문 PII/자유서술 컬럼 제거
--
-- 생성일: 2026-04-20
-- 전제: first_name_encrypted / current_treatment_encrypted / diagnosis_date_encrypted
--       (AES-256-GCM) 컬럼이 이미 존재하고, 신규 row 는 전부 암호화본에만 저장.
--       평문 컬럼은 backward-compat 으로 남아있었음 (4월 17일 커밋 `f8c4c9a` 참고).
--
-- ⚠️ 실행 전 필수 단계:
--   1. POST /api/khidi/intake 가 평문 컬럼에 안 쓰는지 확인 (이미 완료)
--   2. GET /api/khidi/intake 가 평문 컬럼 조회 안 하는지 확인
--      (현재 코드는 masked first_name 반환 → 평문 컬럼 사용. 이것부터 수정 필요)
--   3. 기존 row 중 평문만 있고 암호화본 NULL 인 것은 아래 DO block 에서 차단됨
--   4. Supabase Dashboard → Database → Backups 백업
--
-- ⚠️ 실행 후 코드 변경 필요:
--   - src/types/database.types.ts 재생성 (npm run supabase:gen-types 같은 흐름)
--   - app/api/khidi/intake/route.ts GET 핸들러에서 평문 컬럼 참조 제거

BEGIN;

-- Step 1: 암호화 미이관 row 존재 여부 확인
DO $$
DECLARE
  unencrypted_name integer;
  unencrypted_treatment integer;
  unencrypted_diagnosis integer;
BEGIN
  SELECT COUNT(*) INTO unencrypted_name
  FROM public.cancer_patient_intakes
  WHERE first_name IS NOT NULL AND first_name <> ''
    AND first_name_encrypted IS NULL;

  SELECT COUNT(*) INTO unencrypted_treatment
  FROM public.cancer_patient_intakes
  WHERE current_treatment IS NOT NULL AND current_treatment <> ''
    AND current_treatment_encrypted IS NULL;

  SELECT COUNT(*) INTO unencrypted_diagnosis
  FROM public.cancer_patient_intakes
  WHERE diagnosis_date IS NOT NULL
    AND diagnosis_date_encrypted IS NULL;

  IF unencrypted_name + unencrypted_treatment + unencrypted_diagnosis > 0 THEN
    RAISE EXCEPTION
      '[ABORT] Unencrypted rows detected: first_name=%, current_treatment=%, diagnosis_date=%. Run migration script first.',
      unencrypted_name, unencrypted_treatment, unencrypted_diagnosis;
  END IF;

  RAISE NOTICE 'Safety check passed.';
END $$;

-- Step 2: DROP
ALTER TABLE public.cancer_patient_intakes
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS current_treatment,
  DROP COLUMN IF EXISTS diagnosis_date;

-- Step 3: audit log
INSERT INTO public.admin_audit_logs (admin_email, action, metadata, created_at)
VALUES (
  'migration',
  'DROP_COLUMN',
  jsonb_build_object(
    'table', 'cancer_patient_intakes',
    'columns', array['first_name','current_treatment','diagnosis_date'],
    'reason', 'replaced_by_aes_256_gcm_encrypted_columns',
    'migration_file', '20260420_drop_cancer_intake_plaintext.sql'
  ),
  NOW()
);

COMMIT;
