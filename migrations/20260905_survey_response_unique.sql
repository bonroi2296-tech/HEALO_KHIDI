-- 2026-09-05 보안 감사 7라운드 — 원격 DB 에 적용·검증 완료 (이 파일은 기록용).
--
-- 왜: /api/survey/submit 이 surveys.responded 를 «읽고» 나서 insert 한다(read-check-write).
--     동시 두 번 제출 시 둘 다 responded=false 를 읽어 둘 다 insert 성공 → 만족도 KPI(목표 90점)
--     조작 경로. survey_responses 의 유일 제약이 PK(id) 뿐이라 survey_id 중복이 안 막혔다.
--     실측: 응답 2건·중복 0건이라 제약 추가 안전. (표본 2건 = 방어가 있어서가 아니라 설문이 거의 안 돌아서)
create unique index if not exists survey_responses_one_per_survey
  on public.survey_responses (survey_id);
-- 확인: 2026-09-05 pg_indexes 에 생성 확인됨.

-- ✅ 코드 후속 완료(같은 커밋): app/api/survey/submit/route.ts 가 UNIQUE 위반(23505)을
--   500 이 아니라 409 already_responded 로 갈라 응답한다. 경합에서 진 쪽은 «장애»가 아니라
--   «이미 응답함»이므로 사용자에게 그렇게 보여야 한다.
