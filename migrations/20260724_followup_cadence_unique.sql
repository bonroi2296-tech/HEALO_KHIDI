-- 케이던스 제안(비설문 단계)의 중복 생성 DB 방어선 (독립 리뷰 P-5, 2026-07-24).
--
-- 왜: dispatch-surveys cron 이 followup_schedules 에 케이스당 단계(phase:action)별 1회
-- '제안' 행을 만든다. 앱 존재검사만으로는 동시 실행(정기 cron + 수동 POST 겹침)이
-- 같은 제안 2장 + 직원 종 2회를 만들 수 있다 — "앱 검사만으로는 재발한다, DB 가
-- 마지막 방어선"(20260721 surveys 유니크와 동일 원칙)을 제안에도 적용한다.
--
-- 부분 인덱스: 재예약 단발 제안(kind 없음/source 기반)은 유일성 대상이 아니다.
-- 가역적: 인덱스 추가뿐, 데이터 변경 없음.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_followup_cadence_step
  ON public.followup_schedules (inquiry_id, (schedule->>'phase'), (schedule->>'action'))
  WHERE schedule->>'kind' = 'cadence';
