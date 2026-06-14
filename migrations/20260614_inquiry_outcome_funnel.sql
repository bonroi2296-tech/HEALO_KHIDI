-- 유치 여정 — 코디 수동 확정/이탈 (자동 신호는 조인 계산, 수동 결과만 저장)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS outcome text;          -- null | 'admitted' | 'lost'
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS outcome_note text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS outcome_updated_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS outcome_updated_by uuid;
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_outcome_chk;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_outcome_chk
  CHECK (outcome IS NULL OR outcome IN ('admitted','lost'));
CREATE INDEX IF NOT EXISTS idx_inquiries_outcome ON inquiries(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consult_inquiry_type_status ON consultation_sessions(inquiry_id, session_type, status);
COMMENT ON COLUMN inquiries.outcome IS '유치 여정 수동 결과: admitted(실제 입국·치료 시작) / lost(이탈) / null(진행중).';
