-- 🛑🛑 실행 금지 (2026-07-31 실측으로 전제가 깨졌음). 아래 「왜」를 읽기 전엔 돌리지 마라. 🛑🛑
--
-- 이 파일의 전제("email = 평문, encrypted_email = 암호문")가 **현실과 반대**다. 실DB 실측:
--   · inquiries.email 칸 = 암호문 26건 / 진짜 평문 1건(PO 본인 옛 메일)
--   · inquiries.first_name 칸 = 암호문 29건 / 진짜 평문 1건
--   · encrypted_email · encrypted_name · encrypted_contact 칸 = **전부 0건(안 쓰이는 빈 잔재)**
-- 이유: 접수 경로(app/api/inquiries/step1/route.ts:132-157)가 암호화한 값을
--   encrypted_* 가 아니라 **email · first_name · phone · message 칸에 그대로 넣는다.**
--   즉 이름만 평문스럽지 내용은 AES-256-GCM 암호문이다.
--
-- ⚠️ 그래서 이 파일을 실행하면 **환자 개인정보 26~29건이 통째로 사라진다.** 백업을 떠도
--    같은 오해로 다시 지우게 된다. 문서(docs/EXTERNAL_SETUP_GUIDE.md)에 「실행만 남음」으로
--    적혀 있으니 다음 세션이 그대로 누를 위험이 크다 — 그래서 파일 맨 위에 이 경고를 박는다.
--
-- 진짜로 해야 할 일은 「평문 지우기」가 아니라 둘 중 하나다:
--   (A) 칸 이름을 내용에 맞게 정리한다(email → email_encrypted 등). 코드·타입 동시 수정 필요.
--   (B) 그대로 두되, 「이 칸에는 암호문이 들어간다」를 스키마 주석(comment on column)으로 박는다.
--   어느 쪽이든 **데이터를 지우는 작업이 아니다.** 실행 전 PO 확인 필수(데이터 파괴 규칙).
--
-- 남은 진짜 평문 1건(PO 본인 메일)은 옛 데이터다. 지울지 암호화할지는 별건으로 판단할 것.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- (아래는 2026-04-20 당시 원문. 위 경고를 해소하기 전에는 참고용으로만 볼 것.)
--
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
