-- 2026-06-23: 증상기록에 환자 식별자 추가
-- 배경: symptom_reports 에 작성자(환자) 컬럼이 없어 포털 환자가 증상을 입력해도
--       본인 대시보드/차트에 영영 안 떴음(고아 레코드). 사후관리(ICT ④⑤) 지표와 직결.
-- 가역적(컬럼·인덱스 추가)이라 자동 적용.

alter table public.symptom_reports
  add column if not exists patient_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_symptom_reports_patient_user_id
  on public.symptom_reports (patient_user_id, created_at desc);
