-- HEALO: 데이터 분리 + 암호화 준비 (선택적 마이그레이션)
-- inquiries 테이블을 분리하여 PII와 의료 데이터를 분리
-- 주의: 이 마이그레이션은 기존 데이터를 마이그레이션하지 않음 (새 구조만 생성)

-- ==========================================
-- 1. inquiry_contacts 테이블 (PII)
-- ==========================================

create table if not exists public.inquiry_contacts (
  id uuid primary key default gen_random_uuid(),
  inquiry_id bigint not null references public.inquiries(id) on delete cascade,
  created_at timestamptz default now(),
  
  -- 암호화된 필드 (서버에서 encrypt_text로 저장)
  email_enc text null, -- 암호화된 email
  contact_id_enc text null, -- 암호화된 contact_id (WhatsApp/LINE ID)
  
  -- 검색용 해시 (복호화 불가, 중복 체크용)
  email_hash text null, -- sha256(lower(email))
  
  -- 비암호화 필드 (선택적)
  nationality text null,
  spoken_language text null,
  
  -- 인덱스
  constraint inquiry_contacts_inquiry_id_unique unique (inquiry_id)
);

create index if not exists inquiry_contacts_email_hash_idx
  on public.inquiry_contacts (email_hash);

create index if not exists inquiry_contacts_inquiry_id_idx
  on public.inquiry_contacts (inquiry_id);

-- ==========================================
-- 2. inquiry_medical 테이블 (의료 데이터)
-- ==========================================

create table if not exists public.inquiry_medical (
  id uuid primary key default gen_random_uuid(),
  inquiry_id bigint not null references public.inquiries(id) on delete cascade,
  created_at timestamptz default now(),
  
  -- 암호화된 필드
  message_enc text null, -- 암호화된 message
  
  -- 비암호화 필드
  treatment_type text null,
  preferred_date date null,
  attachment_path text null, -- storage 경로만 저장 (public URL 아님)
  
  -- 인덱스
  constraint inquiry_medical_inquiry_id_unique unique (inquiry_id)
);

create index if not exists inquiry_medical_inquiry_id_idx
  on public.inquiry_medical (inquiry_id);

create index if not exists inquiry_medical_treatment_type_idx
  on public.inquiry_medical (treatment_type);

-- ==========================================
-- 3. inquiries 테이블 정리 (최소 필드만 유지)
-- ==========================================

-- 주의: 기존 컬럼은 유지하되, 새 데이터는 분리 테이블 사용 권장
-- 마이그레이션 전략:
-- 1. 새 레코드는 inquiry_contacts + inquiry_medical에 저장
-- 2. 기존 레코드는 점진적으로 마이그레이션
-- 3. inquiries 테이블은 id, created_at, status, public_token 등만 유지

-- public_token 추가 (외부 노출용 UUID)
alter table public.inquiries
  add column if not exists public_token uuid default gen_random_uuid();

create index if not exists inquiries_public_token_idx
  on public.inquiries (public_token);

-- ==========================================
-- 4. RLS 정책 (분리 테이블)
-- ==========================================

alter table public.inquiry_contacts enable row level security;
alter table public.inquiry_medical enable row level security;

-- inquiry_contacts: 서버만 접근
create policy "inquiry_contacts_all_service_role"
  on public.inquiry_contacts
  for all
  to service_role
  using (true)
  with check (true);

-- inquiry_medical: 서버만 접근
create policy "inquiry_medical_all_service_role"
  on public.inquiry_medical
  for all
  to service_role
  using (true)
  with check (true);

-- ==========================================
-- 5. 마이그레이션 헬퍼 함수 (선택적)
-- ==========================================

-- 기존 inquiries 데이터를 분리 테이블로 마이그레이션하는 함수
-- 주의: 암호화 키는 서버에서 주입 필요
-- create or replace function migrate_inquiry_to_separated(
--   p_inquiry_id bigint,
--   p_encryption_key text
-- ) returns void as $$
-- declare
--   v_inquiry record;
-- begin
--   select * into v_inquiry from public.inquiries where id = p_inquiry_id;
--   
--   -- inquiry_contacts에 삽입
--   insert into public.inquiry_contacts (
--     inquiry_id, email_enc, contact_id_enc, email_hash, nationality, spoken_language
--   ) values (
--     p_inquiry_id,
--     encrypt_text(v_inquiry.email, p_encryption_key),
--     encrypt_text(v_inquiry.contact_id, p_encryption_key),
--     email_hash(v_inquiry.email),
--     v_inquiry.nationality,
--     v_inquiry.spoken_language
--   );
--   
--   -- inquiry_medical에 삽입
--   insert into public.inquiry_medical (
--     inquiry_id, message_enc, treatment_type, preferred_date, attachment_path
--   ) values (
--     p_inquiry_id,
--     encrypt_text(v_inquiry.message, p_encryption_key),
--     v_inquiry.treatment_type,
--     v_inquiry.preferred_date,
--     -- attachment는 URL에서 path 추출 필요
--     null
--   );
-- end;
-- $$ language plpgsql;
