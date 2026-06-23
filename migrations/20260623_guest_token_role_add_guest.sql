-- 2026-06-23: 통합 초대 링크용 범용 역할 'guest' 추가
-- 왜: 코디가 상담 만들 때 역할별 5개 링크(환자·의사·통역·코디·참관) 대신
--     누구나 입장하는 "참여 링크" 1개를 발급하도록 단순화(PO 요청).
--     화상방은 role 무관하게 전원 송출 허용이라(canPublish=true) 권한엔 영향 없음.
-- 가역적: 제약 확대(값 추가)라 롤백 시 기존 5개로 되돌리면 됨.
-- 적용됨: 2026-06-23 (Supabase MCP apply_migration "guest_token_role_add_guest").

ALTER TABLE consultation_guest_tokens DROP CONSTRAINT IF EXISTS consultation_guest_tokens_role_check;
ALTER TABLE consultation_guest_tokens ADD CONSTRAINT consultation_guest_tokens_role_check
  CHECK (role = ANY (ARRAY['patient'::text, 'doctor'::text, 'translator'::text, 'coordinator'::text, 'observer'::text, 'guest'::text]));
