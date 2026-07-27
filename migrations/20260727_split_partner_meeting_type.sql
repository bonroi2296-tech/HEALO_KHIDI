-- 2026-07-27: 회의 종류 분리 — 「환자 사전상담」 vs 「파트너(에이전시·병원) 미팅」
--
-- 왜: 실측 결과 실제로 한 회의 10건이 전부 에이전시 미팅인데 전부 'pre_consultation' 으로
--     저장돼 있었다(«환자측» 참가자가 9건 모두 코디 본인 계정). 지금은 inquiry_id 가 비어
--     KHIDI 지표에 안 잡히지만, 누가 실적을 채우려고 문의를 연결하는 순간 파트너 미팅이
--     «외국인환자 사전상담(K-02)» 으로 집계된다 = 허위실적. 8/27 중간평가 자료 직결.
--
-- 가역적: 허용값 «추가»만 한다. 되돌리려면 partner_meeting 을 목록에서 빼면 된다.

alter table consultation_sessions
  drop constraint if exists consultation_sessions_session_type_check;

alter table consultation_sessions
  add constraint consultation_sessions_session_type_check
  check (session_type = any (array[
    'pre_consultation'::text,  -- 외국인환자 사전상담 (KHIDI K-02 집계 대상)
    'follow_up'::text,         -- 사후관리 (K-04 집계 대상)
    'emergency'::text,
    'partner_meeting'::text    -- 에이전시·병원 등 파트너 미팅 (KHIDI 지표 집계 제외)
  ]));

comment on column consultation_sessions.session_type is
  'pre_consultation=외국인환자 사전상담(K-02) / follow_up=사후관리(K-04) / emergency=응급 / partner_meeting=파트너 미팅(지표 제외). ⚠️ KHIDI 지표는 pre_consultation·follow_up 만 센다 — 파트너 미팅을 여기 넣으면 허위실적이 된다.';

-- 기존 실데이터 재분류 (PO 확인: "이제까지 회의한 거 에이전시"). 테스트 데이터는 손대지 않는다.
-- 되돌리기 전 백업: _backup_session_type_20260727 (id, session_type, is_test, scheduled_at)
create table if not exists _backup_session_type_20260727 as
select id, session_type, is_test, scheduled_at from consultation_sessions;

update consultation_sessions cs
set session_type = 'partner_meeting', updated_at = now()
where cs.is_test = false
  and cs.session_type = 'pre_consultation';

-- ── 롤백 ────────────────────────────────────────────────────────────────
-- update consultation_sessions cs
--   set session_type = b.session_type
--   from _backup_session_type_20260727 b
--  where b.id = cs.id and cs.session_type = 'partner_meeting';
