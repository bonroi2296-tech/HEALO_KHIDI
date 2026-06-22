-- device_tokens: 모바일 푸시 알림(FCM) 대상 기기 토큰 저장
-- 멱등(IF NOT EXISTS) — 재실행 안전. (POSTMORTEMS #6 멱등성 가드 원칙)
-- 보안: RLS 활성 + 공개 정책 없음 = service_role(서버 API)만 접근. 토큰은 PII 아님(기기 식별자).

create table if not exists public.device_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,                       -- FCM 등록 토큰
  platform     text not null check (platform in ('ios','android','web')),
  user_id      uuid references auth.users(id) on delete set null,  -- 로그인 사용자면 연결(선택)
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;
-- 정책을 두지 않음 → anon/authenticated 직접 접근 불가. 등록은 /api/push/register 가 service_role 로 upsert.
