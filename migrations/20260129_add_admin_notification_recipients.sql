/**
 * ✅ 관리자 알림 수신자 관리 테이블
 * 
 * 목적:
 * - 관리자 알림 수신자를 DB에서 관리
 * - 관리자 페이지에서 추가/수정/삭제 가능
 * - ENV fallback 지원
 * 
 * 보안:
 * - 관리자 전용 (RLS 정책)
 * - 전화번호 평문 저장 (발송용, 로그는 마스킹)
 */

-- ========================================
-- 1. admin_notification_recipients 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS admin_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 수신자 정보
  label TEXT NOT NULL, -- 예: "김주영", "야간 당직"
  phone_e164 TEXT NOT NULL, -- E.164 형식: +821012345678
  channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'alimtalk', 'email')),
  
  -- 상태
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- 통계
  last_sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  
  -- 메모
  notes TEXT
);

-- 유니크 제약: 동일 번호 + 채널 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_phone_channel 
ON admin_notification_recipients(phone_e164, channel);

-- 활성 수신자 조회 최적화
CREATE INDEX IF NOT EXISTS idx_recipients_active 
ON admin_notification_recipients(is_active, created_at DESC)
WHERE is_active = true;

-- 업데이트 시각 자동 갱신
CREATE OR REPLACE FUNCTION update_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipients_updated_at
BEFORE UPDATE ON admin_notification_recipients
FOR EACH ROW
EXECUTE FUNCTION update_recipients_updated_at();

-- 코멘트
COMMENT ON TABLE admin_notification_recipients IS '관리자 알림 수신자 (DB 기반 관리)';
COMMENT ON COLUMN admin_notification_recipients.label IS '수신자 식별명 (예: 김주영, 야간 당직)';
COMMENT ON COLUMN admin_notification_recipients.phone_e164 IS 'E.164 형식 전화번호 (+821012345678)';
COMMENT ON COLUMN admin_notification_recipients.channel IS '알림 채널: sms/alimtalk/email';
COMMENT ON COLUMN admin_notification_recipients.is_active IS '활성 여부 (false면 발송 제외)';
COMMENT ON COLUMN admin_notification_recipients.last_sent_at IS '마지막 발송 시각';
COMMENT ON COLUMN admin_notification_recipients.sent_count IS '총 발송 성공 수';
COMMENT ON COLUMN admin_notification_recipients.failed_count IS '총 발송 실패 수';

-- ========================================
-- 2. RLS (Row Level Security) 정책
-- ========================================

-- RLS 활성화
ALTER TABLE admin_notification_recipients ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 모든 작업 가능
-- 주의: 실제 관리자 판별 방식에 맞게 수정 필요
-- 예시 1: auth.uid()가 특정 관리자 목록에 있는지 확인
-- 예시 2: auth.jwt()->>'role' = 'admin'

-- 모든 작업 허용 (관리자 확인 조건 추가 필요)
CREATE POLICY "관리자만 접근 가능" ON admin_notification_recipients
FOR ALL
USING (
  -- ⚠️ 실제 관리자 판별 로직으로 변경 필요
  -- 예: auth.jwt()->>'role' = 'admin'
  -- 또는: auth.uid() IN (SELECT id FROM admin_users WHERE is_admin = true)
  true  -- 임시: 모든 인증된 사용자 (프로덕션에서는 반드시 수정!)
);

-- ========================================
-- 3. 헬퍼 함수
-- ========================================

/**
 * get_active_notification_recipients
 * 
 * 활성화된 수신자 목록 조회
 * 관리자 API에서 사용
 */
CREATE OR REPLACE FUNCTION get_active_notification_recipients()
RETURNS TABLE (
  id UUID,
  label TEXT,
  phone_e164 TEXT,
  channel TEXT,
  last_sent_at TIMESTAMPTZ,
  sent_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.label,
    r.phone_e164,
    r.channel,
    r.last_sent_at,
    r.sent_count
  FROM admin_notification_recipients r
  WHERE r.is_active = true
  ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_notification_recipients IS '활성 알림 수신자 조회 (관리자 API용)';

/**
 * update_recipient_stats
 * 
 * 수신자 통계 업데이트 (발송 성공/실패 시 호출)
 */
CREATE OR REPLACE FUNCTION update_recipient_stats(
  p_recipient_id UUID,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE admin_notification_recipients
    SET 
      last_sent_at = NOW(),
      sent_count = sent_count + 1,
      updated_at = NOW()
    WHERE id = p_recipient_id;
  ELSE
    UPDATE admin_notification_recipients
    SET 
      failed_count = failed_count + 1,
      updated_at = NOW()
    WHERE id = p_recipient_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_recipient_stats IS '수신자 발송 통계 업데이트';

-- ========================================
-- 4. 샘플 데이터 (개발/테스트용)
-- ========================================

-- 주석 처리: 프로덕션에서는 관리자 UI로 추가
-- INSERT INTO admin_notification_recipients (label, phone_e164, channel, is_active)
-- VALUES 
--   ('김주영', '+821012345678', 'sms', true),
--   ('이철수', '+821087654321', 'sms', true),
--   ('야간 당직', '+821011112222', 'sms', false);

-- ========================================
-- 5. 마이그레이션 롤백 (필요 시)
-- ========================================

-- DROP TABLE IF EXISTS admin_notification_recipients CASCADE;
-- DROP FUNCTION IF EXISTS get_active_notification_recipients CASCADE;
-- DROP FUNCTION IF EXISTS update_recipient_stats CASCADE;
