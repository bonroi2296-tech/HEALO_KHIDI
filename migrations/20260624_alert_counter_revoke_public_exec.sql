-- alert_counter RPC 함수 공개 노출 차단 (Supabase advisor 지적)
--
-- 왜: 20260619_alert_counters.sql 의 alert_counter_increment / alert_counter_reset 는
--     SECURITY DEFINER 함수인데, PostgreSQL 기본값상 PUBLIC(=anon·authenticated)에게
--     EXECUTE 권한이 부여되어 REST RPC 로 누구나 호출 가능했음.
--     이 함수들은 cron/서버(service_role, supabaseAdmin)에서만 호출하는 운영 전용 →
--     익명/일반 사용자에게 카운터 조작(임계 알림 교란·리셋) 길을 열어줄 이유가 없음.
--
-- 조치: anon·authenticated 의 EXECUTE 권한 회수. service_role 은 RLS·GRANT 를 우회하므로
--       서버 호출은 그대로 동작(영향 없음).
--
-- 멱등(재실행 안전): REVOKE 는 이미 없는 권한에도 에러 없이 통과.

REVOKE EXECUTE ON FUNCTION public.alert_counter_increment(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.alert_counter_reset(text) FROM anon, authenticated;
