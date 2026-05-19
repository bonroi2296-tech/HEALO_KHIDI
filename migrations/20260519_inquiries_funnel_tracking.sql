-- 통합 inquiry funnel 추적 — 2026-05-19
-- /intake, /inquiry, /consult/start, guided form 4개를 단일 funnel 로 통폐합
-- Step 1 (필수, 1분, 6필드) → Step 2 (선택, 3분, 6필드) → 회원가입 (선택)

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS step1_completed_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS step2_completed_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS ai_chat_thread_id UUID REFERENCES chat_threads(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS cancer_type TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS preferred_language TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS match_accuracy SMALLINT DEFAULT 60;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS short_memo TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_step1 ON inquiries(step1_completed_at DESC) WHERE step1_completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_step2 ON inquiries(step2_completed_at DESC) WHERE step2_completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_cancer_type ON inquiries(cancer_type) WHERE cancer_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_ai_chat ON inquiries(ai_chat_thread_id) WHERE ai_chat_thread_id IS NOT NULL;

COMMENT ON COLUMN inquiries.step1_completed_at IS '1단계 필수 6필드 제출 시각 — 코디 응대 트리거';
COMMENT ON COLUMN inquiries.step2_completed_at IS '2단계 선택 6필드 제출 시각 — 매칭 정확도 향상';
COMMENT ON COLUMN inquiries.ai_chat_thread_id IS 'AI 채팅에서 폼으로 전환된 경우 thread 참조';
COMMENT ON COLUMN inquiries.match_accuracy IS '매칭 정확도 (Step1=60, Step2=90, 의료문서 첨부 시=95)';
