-- 게스트·관리자·옵저버 채팅 전송이 CHECK 제약 위반으로 500 나던 것 수리
-- (반성문 #94 — #62 부류 재발: 역할을 코드에 추가하고 이 테이블의 CHECK 는 안 넓힘.
--  실서비스에는 2026-07-15 Supabase MCP apply_migration 으로 적용 완료 — 이 파일은 기록·재현용)
ALTER TABLE consultation_messages
  DROP CONSTRAINT IF EXISTS consultation_messages_sender_role_check;
ALTER TABLE consultation_messages
  ADD CONSTRAINT consultation_messages_sender_role_check
  CHECK (sender_role = ANY (ARRAY[
    'patient','doctor','coordinator','translator','system','admin','guest','observer'
  ]::text[]));
