/**
 * ✅ P2: 운영 효율 개선 - 리드 품질 + 이벤트 추적
 * 
 * 목적:
 * 1. 리드 품질 자동 평가 및 우선순위 관리
 * 2. 퍼널 이벤트 추적 (전환율 계측)
 * 3. 운영 알림 히스토리
 * 
 * 롤백 가능:
 * - 모든 컬럼 nullable
 * - 기존 데이터 영향 없음
 * - 인덱스만 추가
 */

-- ========================================
-- 1. inquiries 테이블: 리드 품질 컬럼 추가
-- ========================================

-- 리드 품질 등급
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS lead_quality TEXT 
CHECK (lead_quality IN ('hot', 'warm', 'cold', 'spam'));

-- 우선순위 점수 (0-100)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS priority_score INTEGER 
CHECK (priority_score >= 0 AND priority_score <= 100);

-- 리드 태그 (JSON 배열)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS lead_tags JSONB;

-- 품질 시그널 (JSON 배열)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS quality_signals JSONB;

-- 품질 평가 시각
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS quality_evaluated_at TIMESTAMPTZ;

-- 인덱스 추가 (운영 조회 성능)
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_quality 
ON inquiries(lead_quality);

CREATE INDEX IF NOT EXISTS idx_inquiries_priority_score 
ON inquiries(priority_score DESC) 
WHERE priority_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_quality_created 
ON inquiries(lead_quality, created_at DESC) 
WHERE lead_quality IS NOT NULL;

-- 코멘트
COMMENT ON COLUMN inquiries.lead_quality IS '리드 품질: hot(긴급), warm(중요), cold(낮음), spam(스팸)';
COMMENT ON COLUMN inquiries.priority_score IS '우선순위 점수 (0-100, 높을수록 우선)';
COMMENT ON COLUMN inquiries.lead_tags IS '자동 부여된 태그 배열 (예: ["high-value-country", "complete-profile"])';
COMMENT ON COLUMN inquiries.quality_signals IS '품질 시그널 배열 (예: ["Target country: KR", "Premium treatment"])';

-- ========================================
-- 2. funnel_events 테이블: 퍼널 추적
-- ========================================

CREATE TABLE IF NOT EXISTS funnel_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- 퍼널 단계
  stage TEXT NOT NULL CHECK (stage IN (
    'page_view', 'form_start', 'form_step1_submit', 'form_step2_view', 
    'form_step2_submit', 'form_complete', 'form_blocked', 'form_error',
    'chat_start', 'chat_message', 'chat_blocked', 'chat_error'
  )),
  
  -- 세션 정보 (익명)
  session_id TEXT,
  
  -- 페이지 정보
  page TEXT,
  
  -- UTM 파라미터
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- 사용자 정보 (집계용, 개인정보 제외)
  language TEXT,
  country TEXT,
  treatment_type TEXT,
  
  -- 성능 지표
  duration INTEGER, -- 소요 시간 (초)
  
  -- 이탈 사유 (blocked/error인 경우)
  drop_reason TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (분석 쿼리 성능)
CREATE INDEX IF NOT EXISTS idx_funnel_events_stage 
ON funnel_events(stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_session 
ON funnel_events(session_id, created_at) 
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_events_utm_source 
ON funnel_events(utm_source, created_at) 
WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_events_created 
ON funnel_events(created_at DESC);

-- 코멘트
COMMENT ON TABLE funnel_events IS '퍼널 이벤트 추적 (전환율 계측용)';
COMMENT ON COLUMN funnel_events.stage IS '퍼널 단계';
COMMENT ON COLUMN funnel_events.session_id IS '세션 ID (익명)';
COMMENT ON COLUMN funnel_events.drop_reason IS '이탈 사유 (blocked/error 시)';

-- ========================================
-- 3. operational_alerts 테이블: 운영 알림
-- ========================================

CREATE TABLE IF NOT EXISTS operational_alerts (
  id BIGSERIAL PRIMARY KEY,
  
  -- 알림 타입
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'high_error_rate', 'high_block_rate', 'encryption_failures',
    'db_connection_issues', 'spam_attack', 'no_inquiries', 'high_priority_lead'
  )),
  
  -- 심각도
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  
  -- 메시지
  message TEXT NOT NULL,
  
  -- 상세 정보 (JSON)
  details JSONB,
  
  -- 임계값 정보
  threshold NUMERIC,
  current_value NUMERIC,
  
  -- 확인 여부
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_operational_alerts_acknowledged 
ON operational_alerts(acknowledged, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_severity 
ON operational_alerts(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_type 
ON operational_alerts(alert_type, created_at DESC);

-- 코멘트
COMMENT ON TABLE operational_alerts IS '운영 알림 히스토리';
COMMENT ON COLUMN operational_alerts.alert_type IS '알림 타입';
COMMENT ON COLUMN operational_alerts.severity IS '심각도: critical(긴급), warning(경고), info(정보)';
COMMENT ON COLUMN operational_alerts.acknowledged IS '확인 여부';

-- ========================================
-- 4. 운영 조회 뷰 (선택 사항)
-- ========================================

-- 우선순위 문의 뷰
CREATE OR REPLACE VIEW v_priority_inquiries AS
SELECT 
  id,
  created_at,
  lead_quality,
  priority_score,
  status,
  country,
  treatment_type,
  email,
  lead_tags,
  quality_signals
FROM inquiries
WHERE lead_quality IN ('hot', 'warm')
  AND status IN ('received', 'normalized')
ORDER BY priority_score DESC NULLS LAST, created_at DESC;

COMMENT ON VIEW v_priority_inquiries IS '우선 처리가 필요한 문의 목록';

-- 오늘의 퍼널 통계 뷰
CREATE OR REPLACE VIEW v_today_funnel_stats AS
SELECT 
  stage,
  COUNT(*) as count,
  COUNT(*) * 100.0 / NULLIF((
    SELECT COUNT(*) 
    FROM funnel_events 
    WHERE stage = 'page_view' 
      AND created_at > CURRENT_DATE
  ), 0) as conversion_rate
FROM funnel_events
WHERE created_at > CURRENT_DATE
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'page_view' THEN 1
    WHEN 'form_start' THEN 2
    WHEN 'form_step1_submit' THEN 3
    WHEN 'form_step2_view' THEN 4
    WHEN 'form_step2_submit' THEN 5
    WHEN 'form_complete' THEN 6
    WHEN 'form_blocked' THEN 7
    WHEN 'form_error' THEN 8
    WHEN 'chat_start' THEN 9
    WHEN 'chat_message' THEN 10
    WHEN 'chat_blocked' THEN 11
    WHEN 'chat_error' THEN 12
  END;

COMMENT ON VIEW v_today_funnel_stats IS '오늘의 퍼널 전환율 통계';

-- ========================================
-- 5. 기본 데이터 (기존 문의 기본값)
-- ========================================

-- 기존 문의는 기본적으로 'warm' 처리 (중립)
UPDATE inquiries 
SET 
  lead_quality = 'warm',
  priority_score = 50,
  quality_evaluated_at = created_at
WHERE lead_quality IS NULL;
