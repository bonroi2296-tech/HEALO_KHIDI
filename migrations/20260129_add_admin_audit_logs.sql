-- ============================================
-- HEALO: 관리자 조회 감사 로그
-- ============================================
-- 목적: 누가 언제 어떤 문의 데이터를 복호화된 상태로 조회했는지 추적
-- 보안: 환자 평문(email, message 등)은 절대 저장하지 않음
-- ============================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 관리자 정보
    admin_user_id UUID NULL,  -- Supabase Auth user_id (있을 경우)
    admin_email TEXT NOT NULL, -- 관리자 이메일
    
    -- 액션 정보
    action TEXT NOT NULL,      -- 'LIST_INQUIRIES', 'VIEW_INQUIRY', 'UPDATE_INQUIRY' 등
    inquiry_ids BIGINT[] NULL, -- ✅ 조회된 inquiry ID 배열 (bigint[])
    
    -- 요청 메타데이터
    ip_address TEXT NULL,      -- 요청 IP 주소
    user_agent TEXT NULL,      -- 브라우저 User-Agent
    
    -- 추가 컨텍스트 (JSON)
    metadata JSONB NULL,       -- 필터 조건 등 (평문 제외!)
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_admin_audit_logs_admin_email ON public.admin_audit_logs(admin_email);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_inquiry_ids ON public.admin_audit_logs USING GIN(inquiry_ids);

-- 3. RLS 정책 (관리자만 조회 가능)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admin can view audit logs" ON public.admin_audit_logs
    FOR SELECT
    USING (
        -- ✅ ADMIN_EMAIL_ALLOWLIST에 있는 이메일만 조회 가능
        auth.email() IN (
            SELECT unnest(string_to_array(current_setting('app.admin_email_allowlist', true), ','))
        )
    );

-- 서비스 역할은 insert 가능 (API route에서 로그 기록)
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK (true);  -- API route는 service_role_key 사용

-- 4. 코멘트 추가
COMMENT ON TABLE public.admin_audit_logs IS '관리자 조회 감사 로그 - PII 평문은 절대 저장하지 않음';
COMMENT ON COLUMN public.admin_audit_logs.inquiry_ids IS 'inquiry ID 배열 (bigint[]) - public.inquiries.id 참조';
COMMENT ON COLUMN public.admin_audit_logs.metadata IS '필터 조건 등 - PII 평문 절대 포함 금지';
