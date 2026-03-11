-- HEALO: RLS (Row Level Security) 정책 적용
-- hospitals, treatments 테이블 보안 강화
-- 
-- 목적:
-- - anon: is_published = true인 레코드만 SELECT 가능
-- - anon: INSERT/UPDATE/DELETE 금지
-- - authenticated: anon과 동일 (일반 사용자는 읽기만)
-- - service_role: 모든 작업 허용 (Admin API에서만 사용)
-- 
-- 실행 방법:
-- Supabase Dashboard > SQL Editor에서 실행

-- ==========================================
-- 1. RLS 활성화
-- ==========================================

-- hospitals 테이블
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- treatments 테이블
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. hospitals 정책
-- ==========================================

-- ✅ anon + authenticated: SELECT는 is_published = true만
CREATE POLICY "hospitals_select_published"
  ON public.hospitals
  FOR SELECT
  TO public, authenticated
  USING (is_published = true);

-- ❌ anon + authenticated: INSERT/UPDATE/DELETE 금지 (정책 없음 = 거부)

-- ✅ service_role: 모든 작업 허용 (Admin API용)
CREATE POLICY "hospitals_all_service_role"
  ON public.hospitals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 3. treatments 정책
-- ==========================================

-- ✅ anon + authenticated: SELECT는 is_published = true만
CREATE POLICY "treatments_select_published"
  ON public.treatments
  FOR SELECT
  TO public, authenticated
  USING (is_published = true);

-- ❌ anon + authenticated: INSERT/UPDATE/DELETE 금지 (정책 없음 = 거부)

-- ✅ service_role: 모든 작업 허용 (Admin API용)
CREATE POLICY "treatments_all_service_role"
  ON public.treatments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 4. 정책 확인 쿼리 (실행 후 확인용)
-- ==========================================

-- 아래 쿼리를 실행하여 정책이 올바르게 설정되었는지 확인:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('hospitals', 'treatments')
-- ORDER BY tablename, policyname;

-- ==========================================
-- 5. 테스트 쿼리
-- ==========================================

-- ✅ anon으로 테스트 (is_published = true만 조회되어야 함):
-- SET ROLE anon;
-- SELECT id, name, is_published FROM hospitals;
-- SELECT id, name, is_published FROM treatments;
-- RESET ROLE;

-- ❌ anon으로 INSERT 시도 (실패해야 함):
-- SET ROLE anon;
-- INSERT INTO hospitals (name, slug) VALUES ('Test Hospital', 'test');
-- RESET ROLE;

-- ==========================================
-- 보안 정책 요약
-- ==========================================
-- 
-- hospitals:
-- - anon/authenticated: SELECT (is_published = true만)
-- - service_role: ALL (Admin API 전용)
-- 
-- treatments:
-- - anon/authenticated: SELECT (is_published = true만)
-- - service_role: ALL (Admin API 전용)
-- 
-- 클라이언트에서 직접 INSERT/UPDATE/DELETE는 불가능
-- 모든 수정 작업은 /api/admin/* API를 통해서만 가능
