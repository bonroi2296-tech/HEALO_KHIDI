-- 케이스당 설문 1건 → (케이스, 설문 차수)당 1건으로 완화.
--
-- 왜: 사후관리 D+ 케이던스(1주·3개월·6개월 차수별 설문 — PO 결정 2026-07-24)는 한 케이스에
-- 설문이 여러 번 나가야 하는데, 기존 uniq_surveys_inquiry(inquiry_id 단독)가 DB 레벨에서
-- 두 번째 설문부터 전부 막는다.
--
-- 원래 인덱스의 존재 이유(같은 환자에게 무한 재발송 방지 — 20260721 마이그레이션 주석)는
-- (inquiry_id, survey_type) 유일성이 그대로 이어받는다: 같은 차수의 중복 발송은 여전히
-- DB 가 마지막 방어선으로 막고, 다른 차수는 허용된다.
--
-- 가역적: 인덱스 교체뿐, 데이터 변경 없음. 되돌리기 = 이 파일의 역순 실행.
DROP INDEX IF EXISTS uniq_surveys_inquiry;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_surveys_inquiry_type
  ON public.surveys (inquiry_id, survey_type)
  WHERE inquiry_id IS NOT NULL;
