-- HEALO: inquiries public_token 생성/존재 보장 + attachments 다중 첨부
-- public_token: 항상 생성, backfill, unique, 회전 추적
-- attachments: jsonb 배열, 기존 attachment 백필, 하위호환 유지

create extension if not exists pgcrypto;

-- ==========================================
-- 1. public_token
-- ==========================================

alter table public.inquiries
  add column if not exists public_token uuid;

update public.inquiries
set public_token = gen_random_uuid()
where public_token is null;

alter table public.inquiries
  alter column public_token set default gen_random_uuid();

-- NOT NULL: backfill 완료 후 적용
alter table public.inquiries
  alter column public_token set not null;

create unique index if not exists inquiries_public_token_uq
  on public.inquiries(public_token);

-- 토큰 회전 시 추적 (선택)
alter table public.inquiries
  add column if not exists public_token_rotated_at timestamptz;

-- ==========================================
-- 2. attachments (다중 첨부)
-- ==========================================

alter table public.inquiries
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 기존 attachment 값이 있으면 attachments로 백필
update public.inquiries
set attachments =
  case
    when attachment is not null and attachment <> '' then
      jsonb_build_array(jsonb_build_object('path', attachment, 'name', null, 'type', null))
    else
      coalesce(attachments, '[]'::jsonb)
  end
where attachment is not null
  and (attachments is null or attachments = '[]'::jsonb);

create index if not exists inquiries_attachments_gin
  on public.inquiries using gin (attachments);
