-- 2026-09-04 보안 감사 조치 (원격에는 이미 적용됨 — 이 파일은 기록용)
--
-- 배경: 해커 관점 전수 감사에서 나온 것 중 «DB 쪽» 두 건.
--   인증·RLS·암호화·XSS·Storage 는 실측 결과 견고했다(민감 테이블 전부 service_role 전용,
--   문의 46건의 이름·이메일·전화 평문 0건, storage 쓰기는 service_role 전용).

-- ─────────────────────────────────────────────────────────────────
-- 1) rag_health_aggregates 를 미인증자에게서 닫는다
--
-- 이 함수는 SECURITY DEFINER 라 RLS 를 우회하는데, anon·authenticated 가
-- /rest/v1/rpc/rag_health_aggregates 로 직접 부를 수 있었다.
-- 반환값은 RAG 검색 집계(요청수·상태별 카운트·언어별 zero_rate)뿐이라 환자 PII 는 없지만,
-- 내부 운영 지표를 밖에 열어 둘 이유가 없다.
--
-- 🛑 함정: 처음엔 anon·authenticated 에서만 revoke 했는데 «여전히 실행 가능»했다.
--    포스트그레스는 함수를 만들면 기본으로 PUBLIC 에 EXECUTE 를 준다 → 개별 역할에서만
--    거둬도 PUBLIC 경로로 통과한다. 반드시 PUBLIC 에서 거둬야 실제로 닫힌다.
--    적용 후에는 has_function_privilege 로 되재라(「성공」 메시지는 증거가 아니다).
revoke execute on function public.rag_health_aggregates(timestamp with time zone) from public;
revoke execute on function public.rag_health_aggregates(timestamp with time zone) from anon, authenticated;

-- 유일한 호출부(app/api/admin/observability/rag/health)는 service_role 로 부른다 → 명시 보장.
grant execute on function public.rag_health_aggregates(timestamp with time zone) to service_role;

-- ─────────────────────────────────────────────────────────────────
-- 2) images 버킷에서 image/svg+xml 을 뺀다
--
-- SVG 는 스크립트를 품을 수 있고 images 는 public 버킷이라 URL 로 바로 열린다.
-- storage RLS 상 쓰기가 service_role 전용이라 외부인이 올릴 수는 없었지만(그래서 실제
-- 취약점은 아니었다), 형식 자체를 닫아 겹을 하나 더 둔다.
-- 실측: 이 버킷의 SVG 객체 0건 → 깨지는 화면 없음.
update storage.buckets
set allowed_mime_types = array_remove(allowed_mime_types, 'image/svg+xml')
where id = 'images';

-- ─────────────────────────────────────────────────────────────────
-- 되재는 법 (적용 확인용)
--   select has_function_privilege('anon', p.oid, 'EXECUTE')          -- false 여야 함
--        , has_function_privilege('service_role', p.oid, 'EXECUTE')  -- true 여야 함
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'rag_health_aggregates';
--
--   select allowed_mime_types from storage.buckets where id = 'images';  -- svg 없어야 함
