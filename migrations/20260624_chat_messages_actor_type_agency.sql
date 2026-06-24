-- 2026-06-24: chat_messages.actor_type CHECK 확장
-- 에이전시↔코디 메신저(actor_type='agency')를 위해 허용값 확대.
-- 더불어 코드가 이미 쓰던 user/coordinator/bot 도 포함 — 기존 CHECK(patient/admin/system)가
-- 로그인-환자↔코디 메시지 전송을 잠복 차단하던 버그를 동시 수정. (추가형: 허용집합 확대만)
alter table public.chat_messages drop constraint if exists chat_messages_actor_type_check;
alter table public.chat_messages add constraint chat_messages_actor_type_check
  check (actor_type = any (array['patient','admin','system','user','coordinator','bot','agency']));
