-- 2026-07-16: chat_messages.actor_type CHECK 확장 — 'hospital' 추가
-- 국내병원↔코디 메신저(Feature 8, PR #787)가 actor_type='hospital' 로 메시지를 넣는데
-- CHECK 허용집합에 'hospital'이 없어 모든 병원→코디 전송이 잠복 차단(insert 실패→internal_error)되고 있었음.
-- 실서비스 로그인 검증(hospital@test.com)으로 발견. GET(스레드 생성)은 되는데 POST(메시지)만 사망.
--
-- 🔁 재발: 2026-06-24 'agency' 확장(20260624_chat_messages_actor_type_agency.sql)과 완전히 같은 부류.
--   새 actor_type 값을 코드가 쓰는데 CHECK 제약을 같이 안 넓힌 것. (추가형: 허용집합 확대만 — 가역)
alter table public.chat_messages drop constraint if exists chat_messages_actor_type_check;
alter table public.chat_messages add constraint chat_messages_actor_type_check
  check (actor_type = any (array['patient','admin','system','user','coordinator','bot','agency','hospital']));
