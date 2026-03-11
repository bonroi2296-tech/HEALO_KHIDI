-- ============================================
-- HEALO: inquiries 테이블 RLS 정책
-- ============================================
-- 목적: 메타데이터 유출 차단 (2차 방어선)
-- 1차 방어선: 암호화 (PII 보호)
-- 2차 방어선: RLS (메타데이터 보호)
-- ============================================

-- ========================================
-- 1. RLS 활성화
-- ========================================

-- inquiries 테이블에 RLS 활성화
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.inquiries IS 'RLS 활성화: 암호화(1차) + RLS(2차) 이중 방어';

-- ========================================
-- 2. 기본 정책: 모든 public/anon 접근 차단
-- ========================================

-- 🚫 SELECT: 일반 사용자는 조회 불가
-- 근거: 메타데이터(국적, 상태, 생성일 등)도 민감 정보로 간주
CREATE POLICY "Block all SELECT for public/anon"
ON public.inquiries
FOR SELECT
TO PUBLIC
USING (false);

-- 🚫 INSERT: 일반 사용자는 직접 insert 불가
-- 근거: 모든 문의는 /api/inquiries/* 서버 경유로만 생성
--       서버에서 암호화, 검증, 감사로그 등 보안 로직 수행
CREATE POLICY "Block all INSERT for public/anon"
ON public.inquiries
FOR INSERT
TO PUBLIC
WITH CHECK (false);

-- 🚫 UPDATE: 일반 사용자는 수정 불가
-- 근거: 문의 수정은 /api/admin/* 관리자 API로만 수행
CREATE POLICY "Block all UPDATE for public/anon"
ON public.inquiries
FOR UPDATE
TO PUBLIC
USING (false);

-- 🚫 DELETE: 일반 사용자는 삭제 불가
-- 근거: 문의 삭제는 /api/admin/* 관리자 API로만 수행
CREATE POLICY "Block all DELETE for public/anon"
ON public.inquiries
FOR DELETE
TO PUBLIC
USING (false);

-- ========================================
-- 3. service_role 예외 (API 서버)
-- ========================================

-- ✅ service_role은 RLS를 우회하므로 별도 정책 불필요
-- 모든 /api/* 엔드포인트는 supabaseAdmin (service_role_key) 사용
-- 
-- RLS가 적용되는 클라이언트:
-- - supabase.from('inquiries') (anon_key)
-- 
-- RLS가 우회되는 서버:
-- - supabaseAdmin.from('inquiries') (service_role_key)
-- 
-- 기존 API 영향:
-- - /api/inquiries/intake (service_role) → 정상 작동 ✅
-- - /api/inquiries/event (service_role) → 정상 작동 ✅
-- - /api/admin/inquiries (service_role) → 정상 작동 ✅
-- - /api/admin/inquiries/[id] (service_role) → 정상 작동 ✅

-- ========================================
-- 4. 기존 플로우 영향 확인
-- ========================================

-- ✅ 문의 생성: /api/inquiries/event → service_role (RLS 우회)
-- ✅ intake 저장: /api/inquiries/intake → service_role (RLS 우회)
-- ✅ 관리자 목록: /api/admin/inquiries → service_role (RLS 우회)
-- ✅ 관리자 상세: /api/admin/inquiries/[id] → service_role (RLS 우회)
-- 
-- ⚠️ 클라이언트 직접 접근: supabase.from('inquiries') → RLS 차단
--    - src/AdminPage.jsx에서 직접 조회하는 코드는 없음 (확인됨)
--    - 모든 조회는 /api/admin/inquiries를 경유

-- ========================================
-- 5. 보안 테스트 쿼리
-- ========================================

-- ❌ 실패해야 함 (anon_key 사용 시)
-- SELECT * FROM public.inquiries; 
-- → 0 rows (RLS 차단)

-- ✅ 성공해야 함 (service_role_key 사용 시)
-- SELECT * FROM public.inquiries; 
-- → 모든 rows 반환

-- ========================================
-- 6. 운영 모니터링
-- ========================================

-- RLS 정책 확인:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'inquiries';

-- RLS 활성화 확인:
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname = 'inquiries';

-- ========================================
-- 완료
-- ========================================

-- RLS 정책 적용 완료
-- - inquiries 테이블: RLS 활성화
-- - public/anon: 모든 접근 차단 (SELECT/INSERT/UPDATE/DELETE)
-- - service_role: RLS 우회 (기존 API 정상 작동)
-- - 메타데이터 유출 차단 (2차 방어선 구축)
