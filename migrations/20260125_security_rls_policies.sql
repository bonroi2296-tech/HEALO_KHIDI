-- HEALO: RLS (Row Level Security) 정책 적용
-- inquiries, normalized_inquiries, human_touchpoints 테이블 보안 강화
-- 실행 전: Supabase Dashboard > Database > Extensions에서 pgcrypto 활성화 확인

-- ==========================================
-- 1. RLS 활성화
-- ==========================================

-- inquiries 테이블
alter table public.inquiries enable row level security;

-- normalized_inquiries 테이블
alter table public.normalized_inquiries enable row level security;

-- human_touchpoints 테이블
alter table public.human_touchpoints enable row level security;

-- ==========================================
-- 2. inquiries 정책
-- ==========================================

-- 클라이언트: INSERT만 허용 (본인 레코드 읽기 금지)
create policy "inquiries_insert_public"
  on public.inquiries
  for insert
  to public
  with check (true);

-- 클라이언트: SELECT 금지 (서버만 읽기 가능)
-- 주석: 필요시 본인 레코드만 읽기 정책 추가 가능
-- create policy "inquiries_select_own"
--   on public.inquiries
--   for select
--   to authenticated
--   using (auth.uid()::text = user_id::text);

-- 서버(service_role): 모든 작업 허용
create policy "inquiries_all_service_role"
  on public.inquiries
  for all
  to service_role
  using (true)
  with check (true);

-- ==========================================
-- 3. normalized_inquiries 정책
-- ==========================================

-- 클라이언트: SELECT 금지 (서버만 읽기 가능)
-- 주석: 필요시 본인 레코드만 읽기 정책 추가 가능

-- 서버(service_role): 모든 작업 허용
create policy "normalized_inquiries_all_service_role"
  on public.normalized_inquiries
  for all
  to service_role
  using (true)
  with check (true);

-- ==========================================
-- 4. human_touchpoints 정책
-- ==========================================

-- 클라이언트: SELECT 금지 (서버만 읽기 가능)

-- 서버(service_role): 모든 작업 허용
create policy "human_touchpoints_all_service_role"
  on public.human_touchpoints
  for all
  to service_role
  using (true)
  with check (true);

-- ==========================================
-- 5. 기존 정책 확인용 (참고)
-- ==========================================

-- 정책 확인 쿼리:
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- from pg_policies
-- where tablename in ('inquiries', 'normalized_inquiries', 'human_touchpoints');
