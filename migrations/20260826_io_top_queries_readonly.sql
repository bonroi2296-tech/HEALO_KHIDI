-- 디스크 읽기가 많은 쿼리 상위 목록을 «이미 가진» 서비스 열쇠로 읽게 한다.
--
-- 왜 (2026-08-25): 디스크 I/O 점검이 수파베이스 «계정 관리용 토큰»을 따로 발급해야만
--   돌았고, 토큰이 없으면 조용히 통과했다. 그래서 이 점검은 한 번도 자동으로 돈 적이
--   없다. PO 에게 새 열쇠를 달라고 하기 전에 재보니, 이미 가진 서비스 열쇠로 같은 값을
--   볼 수 있었다. 통로를 바꾸고 야간 훑기에 붙였다.
--
-- 안전: 읽기 전용이고 쿼리 «모양»만 돌려준다(값·개인정보는 안 나온다).
--   실행 권한은 service_role 에게만 준다. 손님(anon)·로그인 사용자(authenticated)는 못 부른다.
create or replace function public.io_top_queries(row_limit int default 10)
returns table (query_shape text, calls bigint, disk_read_blocks numeric, total_ms numeric)
language sql
security definer
set search_path = public, extensions, pg_catalog
as $$
  select left(s.query, 120) as query_shape,
         s.calls,
         (s.shared_blks_read + s.local_blks_read + s.temp_blks_read)::numeric as disk_read_blocks,
         round(s.total_exec_time::numeric, 0) as total_ms
    from pg_stat_statements s
   order by (s.shared_blks_read + s.local_blks_read + s.temp_blks_read) desc
   limit greatest(1, least(coalesce(row_limit, 10), 50));
$$;

revoke all on function public.io_top_queries(int) from public, anon, authenticated;
grant execute on function public.io_top_queries(int) to service_role;
