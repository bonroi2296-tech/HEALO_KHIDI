/**
 * ✅ 병원 응답 관리 테이블
 * 
 * 목적:
 * - 병원에게 리드를 전달했는지
 * - 병원의 응답은 무엇인지
 * - 수동 입력 전제 (이메일/카톡 응답 받고 운영자가 입력)
 * 
 * 설계 원칙:
 * - 병원이 이해하기 쉬운 상태 구조
 * - 최소한의 컬럼 (필수만)
 * - 확장 가능 (추후 자동화 대비)
 */

-- ========================================
-- 1. hospital_responses 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS hospital_responses (
  id BIGSERIAL PRIMARY KEY,
  
  -- 연결 정보
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL, -- 병원 이름 (향후 hospitals 테이블과 연결 가능)
  
  -- 전달 정보
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 병원에게 전달한 시각
  sent_by TEXT, -- 전달한 운영자
  sent_method TEXT CHECK (sent_method IN ('email', 'kakao', 'phone', 'manual', 'other')),
  
  -- 병원 응답 상태
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN (
    'pending',        -- 응답 대기 중
    'interested',     -- 관심 있음
    'not_interested', -- 관심 없음
    'contacted',      -- 환자와 연락함
    'consultation',   -- 상담 진행 중
    'quoted',         -- 견적 제시함
    'booked',         -- 예약 확정
    'completed',      -- 시술 완료
    'cancelled'       -- 취소됨
  )),
  
  -- 병원 피드백
  response_at TIMESTAMPTZ, -- 병원이 응답한 시각
  response_notes TEXT, -- 병원의 코멘트/메모
  
  -- 추가 정보
  quoted_price NUMERIC(10, 2), -- 견적 금액 (USD)
  quoted_currency TEXT DEFAULT 'USD',
  consultation_date TIMESTAMPTZ, -- 상담 예정일
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_hospital_responses_inquiry 
ON hospital_responses(inquiry_id);

CREATE INDEX IF NOT EXISTS idx_hospital_responses_status 
ON hospital_responses(response_status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospital_responses_hospital 
ON hospital_responses(hospital_name, response_status);

-- 업데이트 시각 자동 갱신
CREATE OR REPLACE FUNCTION update_hospital_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hospital_responses_updated_at
BEFORE UPDATE ON hospital_responses
FOR EACH ROW
EXECUTE FUNCTION update_hospital_responses_updated_at();

-- 코멘트
COMMENT ON TABLE hospital_responses IS '병원 리드 전달 및 응답 관리';
COMMENT ON COLUMN hospital_responses.inquiry_id IS '원본 문의 ID';
COMMENT ON COLUMN hospital_responses.hospital_name IS '병원 이름';
COMMENT ON COLUMN hospital_responses.sent_at IS '병원에게 전달한 시각';
COMMENT ON COLUMN hospital_responses.sent_method IS '전달 방법 (email/kakao/phone/manual)';
COMMENT ON COLUMN hospital_responses.response_status IS '병원 응답 상태';
COMMENT ON COLUMN hospital_responses.response_notes IS '병원 피드백/메모';

-- ========================================
-- 2. 운영자용 뷰
-- ========================================

-- 응답 대기 중인 리드
CREATE OR REPLACE VIEW v_pending_hospital_responses AS
SELECT 
  hr.id as response_id,
  hr.inquiry_id,
  hr.hospital_name,
  hr.sent_at,
  hr.sent_method,
  i.lead_quality,
  i.priority_score,
  i.nationality,
  i.treatment_type,
  i.email,
  EXTRACT(EPOCH FROM (NOW() - hr.sent_at)) / 3600 as hours_waiting
FROM hospital_responses hr
JOIN inquiries i ON i.id = hr.inquiry_id
WHERE hr.response_status = 'pending'
ORDER BY i.priority_score DESC, hr.sent_at ASC;

COMMENT ON VIEW v_pending_hospital_responses IS '응답 대기 중인 병원 리드 (오래된 순)';

-- 병원별 응답률 통계
CREATE OR REPLACE VIEW v_hospital_response_stats AS
SELECT 
  hospital_name,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN response_status = 'interested' THEN 1 END) as interested_count,
  COUNT(CASE WHEN response_status = 'not_interested' THEN 1 END) as not_interested_count,
  COUNT(CASE WHEN response_status IN ('contacted', 'consultation', 'quoted', 'booked') THEN 1 END) as active_count,
  COUNT(CASE WHEN response_status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN response_status = 'interested' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as interest_rate,
  AVG(EXTRACT(EPOCH FROM (response_at - sent_at)) / 3600) as avg_response_hours
FROM hospital_responses
GROUP BY hospital_name
ORDER BY total_leads DESC;

COMMENT ON VIEW v_hospital_response_stats IS '병원별 리드 응답 통계';

-- ========================================
-- 3. 샘플 데이터 (테스트용)
-- ========================================

-- 샘플 병원 응답 (운영 테스트용, 실제 데이터 있을 때 삭제)
-- INSERT INTO hospital_responses (inquiry_id, hospital_name, sent_method, response_status)
-- VALUES 
--   (1, 'Seoul Plastic Surgery Clinic', 'email', 'interested'),
--   (2, 'Gangnam Beauty Hospital', 'kakao', 'pending'),
--   (3, 'Korea Advanced Medical Center', 'email', 'not_interested');
