-- 2026-09-05 보안 감사: anon·authenticated 가 실행할 이유 없는 RPC 함수 EXECUTE 회수.
-- 원격 DB 에 적용·검증 완료(이 파일은 기록용).
--
-- 배경: anon publishable 키로 /rest/v1/rpc 를 직접 때려보니, 아래 함수들을 anon 이 실행할 수
--   있었다. 실측 결과 «데이터 유출은 없었다» —
--     conversion_funnel*: SECURITY INVOKER 라 anon 권한으론 RLS 에 막혀 집계가 전부 0
--     decrypt_text: 틀린 키로 null / email_hash: 해시만 반환
--   그래도 밖에서 부를 이유가 없다. 특히 encrypt_text/decrypt_text 는 암복호화 함수라
--   anon 실행 가능 자체가 원칙 위반. 코드 확인: 넷 다 supabaseAdmin.rpc(service_role)로만
--   호출된다 → 회수해도 안 깨진다.
--
-- 🛑 PUBLIC 에서 먼저 거둔다 — 개별 역할만 revoke 하면 PUBLIC 경로로 그대로 통과한다
--    (rag_health_aggregates 때 겪은 함정). 재실행 안전: revoke/grant 는 멱등이라 가드 불필요.
--    함수 오버로드(같은 이름 다른 인자)까지 훑으려고 pg_proc 를 돈다.

do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('conversion_funnel','conversion_funnel_by_arrival',
                        'conversion_funnel_by_country','conversion_funnel_by_org',
                        'conversion_funnel_by_source','encrypt_text','decrypt_text','email_hash')
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated;', r.proname, r.args);
    execute format('grant execute on function public.%I(%s) to service_role;', r.proname, r.args);
  end loop;
end $$;

-- 되재는 법: anon 키로 POST /rest/v1/rpc/email_hash → 401 permission denied 면 성공.
--   2026-09-05 실측: conversion_funnel·email_hash·decrypt_text 전부 401 확인.
