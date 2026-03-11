/**
 * HEALO: Email 채널 지원 추가
 * 
 * 목적:
 * - admin_notification_recipients에 email 컬럼 추가
 * - phone_e164를 nullable로 변경 (email 수신자는 전화번호 불필요)
 * - 채널별 필수 필드 validation 추가
 * 
 * 실행: Supabase SQL Editor
 */

-- 1. email 컬럼 추가
ALTER TABLE public.admin_notification_recipients 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. phone_e164 NOT NULL 제약 해제
ALTER TABLE public.admin_notification_recipients 
ALTER COLUMN phone_e164 DROP NOT NULL;

-- 3. 채널별 validation check constraint 추가
-- email 채널이면 email 필수, sms/alimtalk이면 phone_e164 필수
ALTER TABLE public.admin_notification_recipients 
DROP CONSTRAINT IF EXISTS channel_field_validation;

ALTER TABLE public.admin_notification_recipients 
ADD CONSTRAINT channel_field_validation CHECK (
  (channel = 'email' AND email IS NOT NULL) OR
  (channel IN ('sms', 'alimtalk') AND phone_e164 IS NOT NULL)
);

-- 4. email 컬럼에 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_email 
ON public.admin_notification_recipients(email);

-- 5. 기존 데이터 확인 쿼리 (참고용)
-- SELECT id, label, channel, phone_e164, email FROM admin_notification_recipients;

COMMENT ON COLUMN public.admin_notification_recipients.email IS 'Email 채널 수신자의 이메일 주소 (channel=email일 때 필수)';
