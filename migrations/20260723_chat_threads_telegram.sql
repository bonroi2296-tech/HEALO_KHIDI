-- 텔레그램 봇 스레드 라우팅 인덱스 — 웹훅이 chat_id 로 스레드를 find-or-create 하는 경로.
-- 신규 컬럼·테이블 없음(chat_id 는 metadata.telegram.chat_id). 멱등.
create index if not exists chat_threads_tg_chat_id_idx
  on public.chat_threads ((metadata->'telegram'->>'chat_id'))
  where channel = 'telegram';

-- 웹훅 멱등 최종 방어선 — 텔레그램은 update 를 병렬·비순서로 재배달하므로, 같은 update_id 의
-- 환자 메시지는 스레드당 1건만 존재해야 한다(경쟁 삽입은 23505 로 떨어져 웹훅이 중복 처리).
create unique index if not exists chat_messages_tg_update_uidx
  on public.chat_messages (thread_id, ((metadata->>'tg_update_id')))
  where (metadata->>'tg_update_id') is not null;
