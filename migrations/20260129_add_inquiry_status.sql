/**
 * ✅ 운영 안정화: 문의 상태(status) 추가
 * 
 * 목적:
 * - 운영자가 문의 흐름을 한눈에 파악
 * - 차단/실패 사유를 추적 가능하게 함
 * 
 * 상태 정의:
 * - received: 정상 수신됨 (기본값, 기존 데이터)
 * - blocked: Rate limit 등으로 차단됨
 * - normalized: 정규화 완료 (normalized_inquiries에 저장됨)
 * - error: 처리 중 에러 발생
 * 
 * 주의:
 * - nullable로 추가하여 기존 데이터 영향 없음
 * - 기본값은 'received'
 */

-- 1. inquiries 테이블에 status 컬럼 추가
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received' CHECK (status IN ('received', 'blocked', 'normalized', 'error'));

-- 2. status_reason 컬럼 추가 (차단/실패 사유)
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- 3. status 업데이트 시각
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. 기존 데이터에 기본값 설정
UPDATE inquiries 
SET status = 'received', status_updated_at = created_at 
WHERE status IS NULL;

-- 5. 인덱스 추가 (운영 조회 성능)
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_status_updated_at ON inquiries(status_updated_at DESC);

-- 6. 코멘트 추가
COMMENT ON COLUMN inquiries.status IS '문의 상태: received(수신), blocked(차단), normalized(정규화 완료), error(에러)';
COMMENT ON COLUMN inquiries.status_reason IS '차단/실패 사유 (개인정보 없이 기술적 사유만 기록)';
COMMENT ON COLUMN inquiries.status_updated_at IS '상태 업데이트 시각';
