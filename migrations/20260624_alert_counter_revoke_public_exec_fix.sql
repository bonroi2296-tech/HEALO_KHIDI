-- 교정: 직전 20260624_alert_counter_revoke_public_exec.sql 는 무효였음.
--
-- 무엇이 틀렸나: `REVOKE EXECUTE ... FROM anon, authenticated` 만 실행했는데,
--   PostgreSQL 은 새 함수의 EXECUTE 를 기본적으로 PUBLIC 에 부여한다.
--   anon·authenticated 는 PUBLIC 을 상속하므로, 직접 grant 가 없던 이들에게서
--   REVOKE 해도 PUBLIC 상속분이 남아 권한이 그대로였다(has_function_privilege=true).
--   = 마이그레이션은 "성공"했으나 실제로는 아무것도 막지 못한 조용한 실패.
--
-- 조치(실DB 검증 완료: anon=false·authenticated=false·service_role=true):
--   PUBLIC 에서 회수하고, 서버 전용(service_role)에만 명시적으로 EXECUTE 부여.
REVOKE EXECUTE ON FUNCTION public.alert_counter_increment(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.alert_counter_reset(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alert_counter_increment(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.alert_counter_reset(text) TO service_role;
