-- 화상상담 «실제 통화 시간» 기록 컬럼 (2026-07-31)
--
-- 무엇이 비어 있었나 (실측):
--   7월에 시작된 상담 21건이 전부 ended_at = NULL 이었고 duration_seconds 합계가 0분이었다.
--   종료·통화시간은 코디/관리자가 화면에서 「완료」를 손으로 눌러야만 채워지는 구조인데
--   아무도 안 눌렀다. 즉 «상담을 몇 분 했나»를 데이터로 증명할 방법이 없었다
--   (8/27 KHIDI 중간평가에 낼 근거).
--
-- 왜 기존 ended_at/duration_seconds 를 웹훅이 채우지 않는가:
--   그 두 컬럼은 status='completed' 와 한 세트로 K-02(사전상담·사후관리 건수) 집계의
--   정본이다. LiveKit 방이 물리적으로 끝났다고 자동으로 채우면 테스트콜·중단된 콜까지
--   «상담했다»로 섞여 평가 숫자가 부풀려진다(#637 K-02 인플레 사고).
--   → 실적 집계는 사람이 누르는 그대로 두고, «기계가 관측한 사실»만 별도 칸에 적는다.
--     이건 webhook/route.ts 의 room_finished 주석이 예고해 둔 설계 그대로다.
--
-- 되돌리기: 두 컬럼 drop 이면 끝. 기존 컬럼·집계 로직은 한 줄도 안 건드린다.

alter table public.consultation_sessions
  add column if not exists livekit_ended_at timestamptz,
  add column if not exists livekit_duration_seconds integer;

comment on column public.consultation_sessions.livekit_ended_at is
  'LiveKit 방이 실제로 끝난 시각(webhook room_finished). 실적 집계용 ended_at 과 무관 — 관측 사실만.';
comment on column public.consultation_sessions.livekit_duration_seconds is
  'started_at(첫 입장) ~ livekit_ended_at 사이 초. 실적 집계용 duration_seconds 와 무관.';

-- 「끝났는데 시간이 안 남은」 세션을 찾는 운영 조회용. 부분 인덱스라 가볍다.
create index if not exists idx_consultation_sessions_livekit_ended
  on public.consultation_sessions (livekit_ended_at)
  where livekit_ended_at is not null;
