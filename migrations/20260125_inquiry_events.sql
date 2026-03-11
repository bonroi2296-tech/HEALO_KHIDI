-- HEALO: Inquiry Funnel 이벤트 수집
-- 이탈률 추정이 아닌 실제 이벤트 데이터로 증명

create extension if not exists pgcrypto;

create table if not exists public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  inquiry_id bigint references public.inquiries(id) on delete set null,
  event_type text not null,
  meta jsonb default '{}'::jsonb
);

create index if not exists inquiry_events_event_type_idx
  on public.inquiry_events(event_type);

create index if not exists inquiry_events_inquiry_id_idx
  on public.inquiry_events(inquiry_id);

create index if not exists inquiry_events_created_at_idx
  on public.inquiry_events(created_at desc);

-- RLS 활성화 (서버만 접근)
alter table public.inquiry_events enable row level security;

create policy "inquiry_events_all_service_role"
  on public.inquiry_events
  for all
  to service_role
  using (true)
  with check (true);
