-- HEALO: 2-step Inquiry + optional Intake (진행형 수집)
-- inquiries.intake: Step2 입력 저장 (PII 없음)
-- preferred_date_flex: 날짜 유연함 체크 시 true

create extension if not exists pgcrypto;

alter table public.inquiries
  add column if not exists intake jsonb not null default '{}'::jsonb,
  add column if not exists preferred_date_flex boolean not null default false;

create index if not exists inquiries_intake_gin
  on public.inquiries using gin (intake);

-- (이미 적용된 경우 유지)
-- attachments jsonb not null default '[]'::jsonb
-- public_token uuid not null default gen_random_uuid()
