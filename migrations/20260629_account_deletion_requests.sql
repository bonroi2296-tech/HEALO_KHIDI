-- ============================================
-- HEALO: 환자 데이터 삭제 요청 (GDPR Art.17 / PIPA 파기요청권)
-- 날짜: 2026-06-29
-- 실행: Supabase SQL Editor (가역적 추가 — 테이블/인덱스 신설만)
-- ============================================
-- 설계 원칙:
-- - 환자 본인이 "내 데이터 삭제" 요청 → 즉시 하드삭제하지 않고 "요청"을 기록.
--   관리자가 소프트삭제·익명화로 처리(소프트 삭제 원칙 + FK/기록 보존).
-- - PII 최소화: 이 표에는 user_id(uuid)만 저장. 이름·이메일 등 평문 미저장.
-- - 접근통제: RLS 활성 + 정책 없음 = anon/authenticated 기본 차단. 서버(service_role)만 접근.

create table if not exists public.account_deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,                         -- auth.users.id (요청 환자 본인)
  reason       text,                                  -- (선택) 사용자가 적은 사유, 최대 1000자(앱에서 제한)
  status       text not null default 'pending'
               check (status in ('pending','processing','completed','rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,                                  -- 처리한 관리자 식별(이메일 등)
  note         text                                   -- 처리 메모(무엇을 파기/익명화했는지)
);

create index if not exists idx_adr_user   on public.account_deletion_requests(user_id);
create index if not exists idx_adr_status on public.account_deletion_requests(status);

alter table public.account_deletion_requests enable row level security;
-- 정책을 만들지 않음 → 기본 차단(default deny). 서버 API가 service_role 로만 읽고 쓴다.

comment on table public.account_deletion_requests is
  'GDPR Art.17 / PIPA 환자 데이터 삭제 요청. 서버(service_role) 전용. PII 미저장(user_id만).';
