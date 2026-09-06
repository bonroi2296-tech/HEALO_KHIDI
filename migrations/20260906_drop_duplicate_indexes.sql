-- 중복 인덱스 2쌍 정리 (2026-09-06, Supabase 성능 자문 duplicate_index WARN)
--
-- 같은 열·같은 순서의 인덱스가 두 개씩 있었다 — 조회엔 하나만 쓰이고, 쓰기마다 둘 다 갱신돼 헛일이다.
--   chat_messages: (thread_id, created_at) × 2
--   consultation_sessions: (scheduled_at) × 2
-- 데이터는 한 줄도 안 건드린다. 되돌리기 = 아래 주석의 CREATE INDEX 그대로.
--   CREATE INDEX idx_chat_messages_thread_created ON public.chat_messages USING btree (thread_id, created_at);
--   CREATE INDEX idx_consultation_scheduled ON public.consultation_sessions USING btree (scheduled_at);

drop index if exists public.idx_chat_messages_thread_created;
drop index if exists public.idx_consultation_scheduled;
