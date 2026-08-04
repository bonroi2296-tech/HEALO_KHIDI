-- 스태프 개선 요청함 — 코디네이터가 «그때그때 생각난 것»을 적어두는 칸.
--
-- 왜 필요한가 (2026-08-04 PO 제안):
--   화면을 쓰다 불편한 걸 발견해도 적을 데가 없어서 말로 흘렸다. PO 도 어시스턴트도
--   나중에 그걸 찾아볼 방법이 없었다. 폰에서 바로 한 줄 적어 두면 PO 와 어시가 같이 본다.
--
-- 보안: RLS 는 service_role 만. 실제 권한 검사는 API(requirePortalAuth staffOnly)가 한다
--   — 이 저장소의 다른 표와 같은 방식(브라우저에서 직접 못 읽는다).
--
-- 되돌리기: 표를 새로 만들기만 한다. 기존 것에 손대지 않는다.
create table if not exists public.staff_requests (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references auth.users(id) on delete set null,
  author_email  text,
  -- 어느 화면에서 적었나 (자동으로 채운다 — 「어디가 불편한지」를 매번 설명 안 해도 되게)
  screen_path   text,
  body          text not null,
  -- 열림 → 하는중 → 완료 / 보류
  status        text not null default 'open'
                check (status in ('open', 'doing', 'done', 'parked')),
  -- PO·어시스턴트가 남기는 한 줄 답 (고쳤다 / 왜 안 한다)
  reply         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

comment on table public.staff_requests is
  '스태프(코디·어드민)가 적는 개선 요청함. 화면: /coordinator/requests. 2026-08-04 PO 제안.';

create index if not exists staff_requests_status_created_idx
  on public.staff_requests (status, created_at desc);

alter table public.staff_requests enable row level security;

drop policy if exists staff_requests_service_only on public.staff_requests;
create policy staff_requests_service_only on public.staff_requests
  for all
  using ((select auth.jwt() ->> 'role') = 'service_role')
  with check ((select auth.jwt() ->> 'role') = 'service_role');
