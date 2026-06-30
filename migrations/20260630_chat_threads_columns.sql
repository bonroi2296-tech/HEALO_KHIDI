-- chat_threads 스키마 드리프트 보강(재현성) — prod 엔 이미 있으나 마이그레이션 파일에 ADD COLUMN 이
-- 누락돼 있던 컬럼들을 멱등(IF NOT EXISTS)으로 문서화. 신규 DB 재구축 시 prod 와 동일해지도록.
-- (KNOWN_ISSUES "스키마 드리프트" 항목. POSTMORTEMS #6 멱등성 원칙.)
-- prod 적용은 no-op(이미 존재) — 본 파일은 형상 일치용.

alter table public.chat_threads add column if not exists user_id uuid references auth.users(id) on delete set null; -- 익명 시작 후 로그인 시 계정 연결(접수 reachable 판정)
alter table public.chat_threads add column if not exists normalized_inquiry_id uuid;                  -- 정규화 문의 연결(있을 때)
alter table public.chat_threads add column if not exists guest_name text;                              -- 게스트 PII(암호화 저장)
alter table public.chat_threads add column if not exists guest_email text;                             -- 게스트 PII(암호화 저장)
alter table public.chat_threads add column if not exists guest_country text;                           -- 국적
alter table public.chat_threads add column if not exists guest_phone text;                             -- 게스트 PII(암호화 저장)
alter table public.chat_threads add column if not exists browser_session_id text;                      -- 게스트 멀티스레드 식별(쿠키)
alter table public.chat_threads add column if not exists last_active_at timestamptz default now();     -- 오래 쉰 세션(>24h) 자동 경계 배너 기준
alter table public.chat_threads add column if not exists resolved_at timestamptz;                      -- 처리완료 시각
alter table public.chat_threads add column if not exists channel text default 'web';                   -- 유입 채널(web/app 등)

-- 게스트 멀티스레드 목록 조회(GET /api/public/chat/threads)용 인덱스.
create index if not exists chat_threads_browser_session_id_idx on public.chat_threads(browser_session_id);
create index if not exists chat_threads_user_id_idx on public.chat_threads(user_id);
