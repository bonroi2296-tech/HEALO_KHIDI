-- 경과 기록(progress_records) — 사후관리(ICT ④경과 f/u) 업로드
--
-- 해외 의료기관(현지 주치의)·환자가 치료 후 사후관리 단계에서 검사결과·영상·소견을 업로드한다.
-- 2026 KHIDI 공고 6대 ICT ④(수술·시술 경과·검사결과·영상정보 전송·수집·저장) 충족.
-- 근거: docs/KHIDI_역할_프로세스_기획.md §7 "해외 의료기관·환자용 경과 업로드 기능 신설".
--
-- 보안: 민감 의료데이터 → service_role 전용(API가 역할 게이팅). 일반/공개 RLS 정책 없음.
-- 파일 실체는 기존 `documents` 스토리지 버킷에 저장하고 여기엔 storage_path 만 보관.

create table if not exists public.progress_records (
  id               bigserial primary key,
  inquiry_id       bigint not null references public.inquiries(id) on delete cascade,
  agency_id        uuid references public.agencies(id) on delete set null,  -- 업로드한 해외 의료기관
  uploader_user_id uuid,                                                    -- 업로더(auth.users.id)
  uploader_role    text not null default 'medical_institution',            -- medical_institution|patient|coordinator|admin
  record_type      text not null default 'progress',                       -- test_result|imaging|clinical_note|progress
  note             text,
  file_name        text,
  file_type        text,
  file_size        bigint,
  storage_path     text,                                                   -- documents 버킷 경로 (null = 메모만)
  created_at       timestamptz not null default now()
);

create index if not exists idx_progress_records_inquiry on public.progress_records(inquiry_id, created_at desc);
create index if not exists idx_progress_records_agency  on public.progress_records(agency_id);

alter table public.progress_records enable row level security;
-- 공개/일반 정책 없음 → service_role(서버 API)만 접근 가능. (CLAUDE.md 보안규칙: 민감 테이블 service_role 전용)
