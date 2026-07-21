-- 사후관리(follow_up) 진입 시 만족도 설문을 '케이스(inquiry)' 기준으로 발송하기 위한 배선 변경.
--
-- 왜: 만족도 설문 cron 이 consultation_sessions.status='completed' 에만 반응했는데,
--     실데이터상 completed 세션이 영구 0건(전부 scheduled)이라 설문이 구조적으로 0건 →
--     KHIDI K-03(만족도) 데이터가 안 쌓임. 실제 환자 여정은 inquiries.case_status 에 있으므로
--     설문 트리거를 케이스의 사후관리(follow_up) 진입으로 옮긴다. (PO 결정 2026-07-16)
--
-- 가역적(컬럼·인덱스 추가)이라 자동 적용 대상.
alter table surveys add column if not exists inquiry_id bigint references inquiries(id);

-- 케이스당 설문 1건 멱등 검사(cron)와 조회용 인덱스.
create index if not exists idx_surveys_inquiry on surveys(inquiry_id);
