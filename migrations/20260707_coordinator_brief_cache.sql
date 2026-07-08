-- 코디 케이스 브리프(AI 초안) 캐시.
-- coordinator_brief: 암호화 JSON(AES-256-GCM) — 브리프는 암호화 message 를 합성한 민감내용이라 평문 저장 금지.
-- coordinator_brief_sig: 생성 시점 입력 서명(첨부 경로 목록). 현재 첨부와 다르면 stale → 다음 열람 때 자동 재생성.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS coordinator_brief TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS coordinator_brief_sig TEXT;

COMMENT ON COLUMN inquiries.coordinator_brief IS 'AI 케이스 브리프 캐시(암호화 JSON). on-demand 생성→암호화 저장, 열람 시 복호화. 저장은 staff 전용 API 경유.';
COMMENT ON COLUMN inquiries.coordinator_brief_sig IS '브리프 생성 시점 입력 서명(첨부 경로). 현재와 다르면 stale → 자동 재생성.';
