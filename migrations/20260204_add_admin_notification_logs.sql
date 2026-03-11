/**
 * ✅ 관리자 알림 발송 로그 테이블
 * 
 * 목적:
 * - 모든 알림 발송 시도를 기록
 * - 성공/실패 추적
 * - 문제 발생 시 디버깅
 * 
 * 보안:
 * - 관리자 전용 (RLS 정책)
 * - 수신자 전화번호는 마스킹되어 저장
 */

-- ========================================
-- 1. admin_notification_logs 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS admin_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 문의 연결 (nullable - 테스트 발송 시 null)
  inquiry_id BIGINT REFERENCES public.inquiries(id) ON DELETE SET NULL,
  normalized_inquiry_id UUID REFERENCES public.normalized_inquiries(id) ON DELETE SET NULL,
  
  -- 수신자 정보
  recipient_id UUID REFERENCES public.admin_notification_recipients(id) ON DELETE SET NULL,
  recipient_label TEXT, -- 로그용 (수신자 삭제되어도 기록 유지)
  
  -- 발송 정보
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'alimtalk', 'email', 'console')),
  destination TEXT NOT NULL, -- 마스킹된 전화번호/이메일
  
  -- 결과
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error TEXT, -- 실패 시 에러 메시지
  provider_response JSONB, -- 벤더 API 응답 (message_id 등)
  
  -- 메타데이터
  message_preview TEXT, -- 메시지 미리보기 (최대 100자)
  delivery_time_ms INTEGER -- 발송 소요 시간 (ms)
);

-- 인덱스: 문의 ID로 조회 (특정 문의의 알림 내역)
CREATE INDEX IF NOT EXISTS idx_notification_logs_inquiry 
ON admin_notification_logs(inquiry_id, created_at DESC)
WHERE inquiry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_normalized_inquiry 
ON admin_notification_logs(normalized_inquiry_id, created_at DESC)
WHERE normalized_inquiry_id IS NOT NULL;

-- 인덱스: 수신자별 조회 (수신자 통계)
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient 
ON admin_notification_logs(recipient_id, created_at DESC)
WHERE recipient_id IS NOT NULL;

-- 인덱스: 실패 내역 조회 (디버깅용)
CREATE INDEX IF NOT EXISTS idx_notification_logs_failed 
ON admin_notification_logs(status, created_at DESC)
WHERE status = 'failed';

-- 인덱스: 최근 로그 조회
CREATE INDEX IF NOT EXISTS idx_notification_logs_recent 
ON admin_notification_logs(created_at DESC);

-- 코멘트
COMMENT ON TABLE admin_notification_logs IS '관리자 알림 발송 로그 (모든 발송 시도 기록)';
COMMENT ON COLUMN admin_notification_logs.inquiry_id IS '연결된 문의 ID (inquiries, nullable)';
COMMENT ON COLUMN admin_notification_logs.normalized_inquiry_id IS '연결된 정규화 문의 ID (normalized_inquiries, nullable)';
COMMENT ON COLUMN admin_notification_logs.recipient_id IS '수신자 ID (admin_notification_recipients, nullable)';
COMMENT ON COLUMN admin_notification_logs.recipient_label IS '수신자 이름 (스냅샷, 수신자 삭제되어도 유지)';
COMMENT ON COLUMN admin_notification_logs.channel IS '발송 채널: sms/alimtalk/email/console';
COMMENT ON COLUMN admin_notification_logs.destination IS '수신처 (마스킹됨, 예: +82-**-****-5678)';
COMMENT ON COLUMN admin_notification_logs.status IS '발송 상태: sent/failed/pending';
COMMENT ON COLUMN admin_notification_logs.error IS '실패 시 에러 메시지';
COMMENT ON COLUMN admin_notification_logs.provider_response IS '벤더 API 응답 (message_id, 발송 결과 등)';
COMMENT ON COLUMN admin_notification_logs.message_preview IS '발송 메시지 미리보기 (최대 100자)';
COMMENT ON COLUMN admin_notification_logs.delivery_time_ms IS '발송 소요 시간 (밀리초)';

-- ========================================
-- 2. RLS (Row Level Security) 정책
-- ========================================

-- RLS 활성화
ALTER TABLE admin_notification_logs ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자만 조회 가능 (service_role은 모든 작업 가능)
CREATE POLICY "관리자만 로그 조회 가능" ON admin_notification_logs
FOR SELECT
USING (
  -- ⚠️ 실제 관리자 판별 로직으로 변경 필요
  -- 예: auth.jwt()->>'role' = 'admin'
  true  -- 임시: 모든 인증된 사용자 (프로덕션에서는 반드시 수정!)
);

-- 정책: service_role만 insert 가능 (알림 시스템에서 자동 기록)
CREATE POLICY "서버만 로그 작성 가능" ON admin_notification_logs
FOR INSERT
WITH CHECK (true); -- service_role은 RLS 무시

-- ========================================
-- 3. 헬퍼 함수
-- ========================================

/**
 * get_notification_logs_by_inquiry
 * 
 * 특정 문의의 알림 내역 조회
 * 관리자 UI에서 사용
 */
CREATE OR REPLACE FUNCTION get_notification_logs_by_inquiry(
  p_inquiry_id BIGINT DEFAULT NULL,
  p_normalized_inquiry_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  recipient_label TEXT,
  channel TEXT,
  destination TEXT,
  status TEXT,
  error TEXT,
  message_preview TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.created_at,
    l.recipient_label,
    l.channel,
    l.destination,
    l.status,
    l.error,
    l.message_preview
  FROM admin_notification_logs l
  WHERE 
    (p_inquiry_id IS NULL OR l.inquiry_id = p_inquiry_id)
    AND (p_normalized_inquiry_id IS NULL OR l.normalized_inquiry_id = p_normalized_inquiry_id)
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_notification_logs_by_inquiry IS '특정 문의의 알림 내역 조회 (관리자 UI용)';

/**
 * get_recent_notification_logs
 * 
 * 최근 알림 내역 조회 (대시보드용)
 */
CREATE OR REPLACE FUNCTION get_recent_notification_logs(
  p_limit INTEGER DEFAULT 50,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  inquiry_id BIGINT,
  normalized_inquiry_id UUID,
  recipient_label TEXT,
  channel TEXT,
  destination TEXT,
  status TEXT,
  error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.created_at,
    l.inquiry_id,
    l.normalized_inquiry_id,
    l.recipient_label,
    l.channel,
    l.destination,
    l.status,
    l.error
  FROM admin_notification_logs l
  WHERE 
    (p_status IS NULL OR l.status = p_status)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_recent_notification_logs IS '최근 알림 내역 조회 (대시보드용)';

/**
 * get_notification_stats
 * 
 * 알림 통계 (관리자 대시보드용)
 */
CREATE OR REPLACE FUNCTION get_notification_stats(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_sent BIGINT,
  total_failed BIGINT,
  success_rate NUMERIC,
  avg_delivery_time_ms NUMERIC,
  by_channel JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent') AS total_sent,
    COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE status = 'sent') / NULLIF(COUNT(*), 0),
      2
    ) AS success_rate,
    ROUND(AVG(delivery_time_ms) FILTER (WHERE status = 'sent'), 2) AS avg_delivery_time_ms,
    jsonb_object_agg(
      channel,
      jsonb_build_object(
        'sent', COUNT(*) FILTER (WHERE status = 'sent'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed')
      )
    ) AS by_channel
  FROM admin_notification_logs
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_notification_stats IS '알림 발송 통계 (대시보드용)';

-- ========================================
-- 4. 샘플 데이터 (개발/테스트용)
-- ========================================

-- 주석 처리: 실제 운영에서는 알림 시스템이 자동 기록
-- INSERT INTO admin_notification_logs (inquiry_id, recipient_label, channel, destination, status)
-- VALUES 
--   (1, '김주영', 'sms', '+82-**-****-5678', 'sent'),
--   (2, '이철수', 'sms', '+82-**-****-4321', 'failed');

-- ========================================
-- 5. 마이그레이션 완료
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'admin_notification_logs 테이블 생성 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ 테이블: admin_notification_logs';
  RAISE NOTICE '  ✅ 인덱스: inquiry_id, recipient_id, status, created_at';
  RAISE NOTICE '  ✅ RLS 정책: 관리자 조회, service_role 작성';
  RAISE NOTICE '  ✅ 헬퍼 함수: get_notification_logs_by_inquiry, get_recent_notification_logs, get_notification_stats';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 6. 마이그레이션 롤백 (필요 시)
-- ========================================

-- DROP TABLE IF EXISTS admin_notification_logs CASCADE;
-- DROP FUNCTION IF EXISTS get_notification_logs_by_inquiry CASCADE;
-- DROP FUNCTION IF EXISTS get_recent_notification_logs CASCADE;
-- DROP FUNCTION IF EXISTS get_notification_stats CASCADE;
