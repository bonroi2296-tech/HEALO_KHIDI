-- 왓츠앱 봇 채널 인덱스 — 2026-07-23 (텔레그램 20260723_chat_threads_telegram.sql 과 동일 패턴)
-- ①스레드 조회: channel='whatsapp' + metadata.whatsapp.wa_id 표현식 인덱스
-- ②멱등 최종 방어선: 같은 스레드에 같은 wa_message_id(wamid) 중복 저장 차단(부분 유니크)
-- 재실행 안전(IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS chat_threads_wa_id_idx
  ON chat_threads ((metadata->'whatsapp'->>'wa_id'))
  WHERE channel = 'whatsapp';

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_wa_msg_uidx
  ON chat_messages (thread_id, (metadata->>'wa_message_id'))
  WHERE metadata->>'wa_message_id' IS NOT NULL;
