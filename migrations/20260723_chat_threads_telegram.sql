-- 텔레그램 봇 스레드 라우팅 인덱스 — 웹훅이 chat_id 로 스레드를 find-or-create 하는 경로.
-- 신규 컬럼·테이블 없음(chat_id 는 metadata.telegram.chat_id). 멱등.
create index if not exists chat_threads_tg_chat_id_idx
  on public.chat_threads ((metadata->'telegram'->>'chat_id'))
  where channel = 'telegram';
