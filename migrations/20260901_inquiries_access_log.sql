-- 문의 접수·수정 시점의 접속기록(IP·브라우저)을 남긴다.
--
-- 왜: 2026-09-01 실적 정리 중 같은 환자가 21분 차이로 두 번 접수한 건(#93·#94)이
--     나왔는데, 「누가 올렸나」를 확인할 방법이 없었다. 문의 화면은 로그인 없이
--     쓰기 때문에 계정이 안 남고, IP 는 속도 제한에만 쓰고 버리고 있었다.
--
-- 무엇을: inquiries.access_log 에 단계별 기록을 배열로 쌓는다.
--   [{"at":"2026-09-01T06:12:00Z","step":"step1","ip":"1.2.3.4","ua":"Mozilla/..."}]
--
-- ⚠️ IP 는 개인정보다. 이 컬럼을 켜는 것과 함께 개인정보처리방침의
--    「수집 항목」에 접속기록(IP·브라우저 정보)을 명시해야 한다.
--    (같은 날 privacyPolicy.js 에 함께 반영)

alter table public.inquiries
  add column if not exists access_log jsonb not null default '[]'::jsonb;

comment on column public.inquiries.access_log is
  '문의 접수·수정 시점의 접속기록 배열. 항목: {at, step, ip, ua}. 개인정보처리방침 「수집 항목」에 고지됨.';

-- 조회는 「이 IP 로 들어온 문의 찾기」가 대부분이라 GIN 으로 충분하다.
create index if not exists idx_inquiries_access_log
  on public.inquiries using gin (access_log);
