-- 상담 녹화 대장 (2026-07-28) — LiveKit Egress 준비분
--
-- 왜 테이블이 필요한가: 녹화는 «찍었다»보다 «누가 언제 찍었고 언제 지워지나»가 중요하다.
--   파일만 저장소에 쌓아두면 파기 기한도, 시작한 사람도, 중복 녹화 여부도 알 수 없다.
--   상담 1건에 여러 번 녹화할 수 있으므로 세션당 여러 행.
--
-- ⚠️ 이 테이블은 «준비»다. 녹화 기능 자체는 `CONSULT_RECORDING_ENABLED` 스위치가
--   꺼져 있어 아직 한 줄도 안 쌓인다 (PO 지시 2026-07-28: 바로 오픈 금지).
--
-- 보안: 민감도 최상(환자 상담 음성의 소재지). service_role 전용 —
--   RLS 를 켜되 정책을 만들지 않아 anon·authenticated 는 어떤 행도 못 본다.

create table if not exists public.consultation_recordings (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultation_sessions(id) on delete cascade,
  egress_id text not null,
  -- recording(진행중) → stopped(정상 종료) → deleted(보관기간 만료·파기됨)
  status text not null default 'recording'
    check (status in ('recording', 'stopped', 'deleted', 'failed')),
  audio_only boolean not null default true,
  file_path text,
  duration_sec integer,
  -- 시작한 운영자. 게스트 코디는 계정이 없어 null 일 수 있다(그 경우 egress_id 가 추적 실마리).
  started_by uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- 보관 기한. 지난 행은 파일까지 지우고 status='deleted' 로 바꾼다.
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 「지금 이 상담이 녹화 중인가」 조회가 가장 잦다.
create index if not exists idx_consultation_recordings_active
  on public.consultation_recordings (consultation_id, status);

-- 파기 배치가 기한 지난 행을 훑는다.
create index if not exists idx_consultation_recordings_expires
  on public.consultation_recordings (expires_at)
  where status = 'stopped';

alter table public.consultation_recordings enable row level security;

comment on table public.consultation_recordings is
  '상담 녹화 대장(LiveKit Egress). service_role 전용 — 정책 없이 RLS 만 켜서 클라이언트 직접 조회를 막는다.';
comment on column public.consultation_recordings.expires_at is
  '보관 기한. 이 시각이 지나면 저장소 파일까지 지우고 status=deleted 로 바꾼다(기본 90일).';
