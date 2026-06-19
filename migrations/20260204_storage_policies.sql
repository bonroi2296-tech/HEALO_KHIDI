-- HEALO: Storage Bucket 보안 정책
-- 
-- 목적:
-- - images bucket: public READ, admin-only WRITE
-- - attachments bucket: admin-only READ/WRITE (이미 설정되어 있을 수 있음)
-- 
-- 보안 원칙:
-- - 일반 사용자는 이미지를 직접 업로드할 수 없음
-- - 관리자만 업로드 가능 (service_role 또는 admin@healo.com)
-- - 향후: signed upload URL로 마이그레이션 권장
-- 
-- 실행 방법:
-- Supabase Dashboard > Storage > Policies에서 GUI로 설정하거나
-- SQL Editor에서 실행

-- ==========================================
-- 1. 기존 정책 제거 (있다면)
-- ==========================================

-- images bucket 기존 정책 확인
-- SELECT * FROM storage.policies WHERE bucket_id = 'images';

-- 기존 정책 제거 (필요시)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;

-- 멱등성: 이 마이그레이션이 생성하는 정책도 미리 제거(재실행 안전)
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "images_service_role_write" ON storage.objects;
DROP POLICY IF EXISTS "images_service_role_update" ON storage.objects;
DROP POLICY IF EXISTS "images_service_role_delete" ON storage.objects;
DROP POLICY IF EXISTS "attachments_service_role_all" ON storage.objects;

-- ==========================================
-- 2. images bucket 정책 (공개 읽기, 관리자만 쓰기)
-- ==========================================

-- ✅ 모두가 읽기 가능 (public 이미지용)
CREATE POLICY "images_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');

-- ✅ 관리자만 업로드 가능
-- 방법 1: service_role (Admin API에서 사용)
CREATE POLICY "images_service_role_write"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'images');

-- 방법 2: admin@healo.com 이메일로 직접 업로드 허용 (옵션)
-- 주의: 이 방법은 브라우저에서 직접 업로드를 허용하므로 권장하지 않음
-- CREATE POLICY "images_admin_write"
--   ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'images' 
--     AND auth.jwt() ->> 'email' = 'admin@healo.com'
--   );

-- ✅ 관리자만 수정/삭제 가능
CREATE POLICY "images_service_role_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_service_role_delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'images');

-- ==========================================
-- 3. attachments bucket 정책 (관리자만 읽기/쓰기)
-- ==========================================

-- ✅ service_role만 모든 작업 허용
CREATE POLICY "attachments_service_role_all"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'attachments')
  WITH CHECK (bucket_id = 'attachments');

-- ❌ public/authenticated는 접근 불가 (정책 없음 = 거부)
-- 관리자는 signed URL을 통해 다운로드 제공

-- ==========================================
-- 4. 정책 확인 쿼리
-- ==========================================

-- 아래 쿼리를 실행하여 정책이 올바르게 설정되었는지 확인:
-- SELECT bucket_id, name, operation, definition
-- FROM storage.policies
-- WHERE bucket_id IN ('images', 'attachments')
-- ORDER BY bucket_id, name;

-- ==========================================
-- 5. 테스트 시나리오
-- ==========================================

-- ✅ public으로 이미지 읽기 (성공해야 함):
-- SELECT * FROM storage.objects WHERE bucket_id = 'images' LIMIT 1;

-- ❌ anon으로 이미지 업로드 (실패해야 함):
-- SET ROLE anon;
-- INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('images', 'test.jpg', auth.uid());
-- RESET ROLE;

-- ==========================================
-- 향후 권장 사항: Signed Upload URL
-- ==========================================
-- 
-- 현재 문제:
-- - Admin 페이지에서 브라우저가 직접 storage.upload() 호출
-- - service_role을 사용할 수 없음 (브라우저 노출 위험)
-- 
-- 해결 방법 (Phase 2):
-- 1. /api/admin/images/upload-url 엔드포인트 생성
-- 2. 서버에서 signed upload URL 생성 (service_role)
-- 3. 브라우저는 signed URL로 업로드 (임시 권한)
-- 4. 업로드 완료 후 URL 반환
-- 
-- 장점:
-- - 브라우저는 직접 storage 접근 불가
-- - 파일 크기/타입 검증 가능
-- - Rate limiting 적용 가능
-- - 업로드 이력 감사 로그 기록

-- ==========================================
-- 임시 해결책: Admin 이메일로 직접 업로드 허용
-- ==========================================
-- 
-- 주의: 이 방법은 브라우저에서 직접 업로드를 허용하므로
-- 보안상 완벽하지 않습니다. 프로덕션에서는 signed URL 방식을 권장합니다.
-- 
-- 위에서 주석 처리된 "images_admin_write" 정책의 주석을 해제하면
-- admin@healo.com 계정으로 로그인한 브라우저에서 직접 업로드 가능합니다.
