-- 외부 서비스 사용량 화면: Supabase DB·스토리지 실측 RPC
--
-- 왜: 어드민 '외부 서비스 사용량' 화면이 Supabase 무료 한도(DB 500MB·스토리지 1GB)
--     대비 실제 사용량을 라이브로 보여주려면 pg_database_size·storage.objects 를 읽어야
--     한다. supabase-js 는 임의 SQL 을 못 돌리므로 RPC 로 노출(service_role 전용).
--
-- 멱등(재실행 안전): CREATE OR REPLACE.
-- 보안: SECURITY DEFINER + search_path 고정. PUBLIC/anon/authenticated 실행 회수,
--       service_role(supabaseAdmin)에만 EXECUTE 부여. 반환은 집계 용량뿐(PII 없음).

CREATE OR REPLACE FUNCTION public.get_external_db_usage()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'storage_bytes', (SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects),
    'storage_objects', (SELECT count(*) FROM storage.objects),
    'top_tables', (SELECT jsonb_agg(t) FROM (
       SELECT relname AS "table", pg_total_relation_size(c.oid) AS bytes
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 6) t)
  );
$$;

REVOKE ALL ON FUNCTION public.get_external_db_usage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_external_db_usage() TO service_role;
