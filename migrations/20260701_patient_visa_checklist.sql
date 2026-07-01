-- ============================================
-- HEALO: 환자 비자 서류 준비 체크리스트 (계정 저장)
-- 날짜: 2026-07-01
-- 실행: Supabase SQL Editor (가역적 추가 — 테이블/정책 신설만)
-- ============================================
-- 설계 원칙:
-- - 비자 가이드(/patient/visa)에서 "필요 서류" 체크를 로그인 환자 계정에 저장 →
--   다른 기기에서도 준비 진행이 이어짐. 비로그인은 localStorage 폴백(서버 미사용).
-- - 비민감: 문서 준비 여부(boolean) 맵만 저장. PII/이름/이메일 미저장.
-- - 접근통제: RLS 활성 + 본인(auth.uid()=user_id)만 CRUD. 서버 API는 service_role로
--   user_id 스코프를 명시해 접근(정책은 심층방어).

create table if not exists public.patient_visa_checklist (
  user_id    uuid not null,                                   -- auth.users.id (본인)
  visa_type  text not null check (visa_type in ('C-3-3','G-1-10')),
  checked    jsonb not null default '{}'::jsonb,              -- { docId: true } 준비 여부 맵
  updated_at timestamptz not null default now(),
  primary key (user_id, visa_type)
);

alter table public.patient_visa_checklist enable row level security;

-- 본인 행만 읽기/쓰기 (심층방어 — API는 service_role + user_id 스코프)
drop policy if exists pvc_select_own on public.patient_visa_checklist;
create policy pvc_select_own on public.patient_visa_checklist
  for select using (auth.uid() = user_id);

drop policy if exists pvc_insert_own on public.patient_visa_checklist;
create policy pvc_insert_own on public.patient_visa_checklist
  for insert with check (auth.uid() = user_id);

drop policy if exists pvc_update_own on public.patient_visa_checklist;
create policy pvc_update_own on public.patient_visa_checklist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pvc_delete_own on public.patient_visa_checklist;
create policy pvc_delete_own on public.patient_visa_checklist
  for delete using (auth.uid() = user_id);

comment on table public.patient_visa_checklist is
  '환자 비자 서류 준비 체크리스트(로그인 본인 소유). RLS: 본인만. 비민감(문서 준비 boolean 맵).';
