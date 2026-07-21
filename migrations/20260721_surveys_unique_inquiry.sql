-- 케이스당 설문 1건을 DB 레벨에서 못 박는다.
--
-- 왜: dispatch-surveys cron 이 두 경로(세션·케이스)로 설문을 만드는데, 애플리케이션 존재검사만으로는
-- 순서에 따라 같은 환자에게 두 번 나갈 수 있었다(독립 리뷰 2026-07-21 지적).
-- 게다가 한 inquiry_id 에 행이 2개가 되는 순간 .maybeSingle() 이 에러를 내고, 그 에러를 흘리면
-- "대상 없음"으로 오인해 **매일 새 설문을 보내는 무한 루프**가 된다. 코드 가드만으로는 이 부류가
-- 재발하므로 DB 가 마지막 방어선이 된다.
--
-- 부분 인덱스인 이유: 세션 경로에는 inquiry_id 가 null 인 행이 존재할 수 있고(세션에 inquiry 미연결),
-- null 끼리는 유일성 대상이 아니어야 한다.
--
-- 가역적: DROP INDEX 로 즉시 되돌아간다. 데이터 변경 없음.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_surveys_inquiry
  ON public.surveys (inquiry_id)
  WHERE inquiry_id IS NOT NULL;
