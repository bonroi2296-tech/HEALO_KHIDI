-- 게스트 채팅 식별 정보 (회원가입 아닌 가벼운 명함)
-- 적용일: 2026-05-18

ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS guest_country TEXT;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS browser_session_id TEXT;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_chat_threads_browser_session ON chat_threads(browser_session_id) WHERE browser_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_threads_guest_email ON chat_threads(guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_active ON chat_threads(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_channel ON chat_threads(channel);

COMMENT ON COLUMN chat_threads.guest_name IS '게스트가 입력한 이름 (회원가입 아님)';
COMMENT ON COLUMN chat_threads.guest_email IS '게스트가 입력한 이메일 (선택)';
COMMENT ON COLUMN chat_threads.guest_country IS '환자 국적 (KZ/RU/CN 등)';
COMMENT ON COLUMN chat_threads.browser_session_id IS '쿠키 기반 재방문 식별자';
COMMENT ON COLUMN chat_threads.last_active_at IS '마지막 메시지 또는 방문 시각';
COMMENT ON COLUMN chat_threads.channel IS '채널: web | whatsapp | telegram | email | line';
