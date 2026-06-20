-- HEALO: Hospital Users (병원 담당자 계정)
--
-- 목적:
-- - 병원 담당자가 자체 포털에 로그인하여 리드/프로필 관리
-- - Supabase Auth와 hospitals 테이블을 연결
-- - 역할 기반 접근 제어 (owner/manager/viewer)
--
-- 실행 방법:
-- Supabase Dashboard > SQL Editor에서 실행

-- ==========================================
-- 1. hospital_users 테이블 생성
-- ==========================================

CREATE TABLE IF NOT EXISTS public.hospital_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  role text NOT NULL DEFAULT 'manager'
    CHECK (role IN ('owner', 'manager', 'viewer')),
  
  is_active boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, hospital_id)
);

COMMENT ON TABLE public.hospital_users IS '병원 담당자 계정 - Supabase Auth 유저와 병원을 연결';
COMMENT ON COLUMN public.hospital_users.role IS 'owner: 전체 권한, manager: 프로필/시술/리드 관리, viewer: 조회만';

-- ==========================================
-- 2. 인덱스
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_hospital_users_user_id
  ON public.hospital_users(user_id);

CREATE INDEX IF NOT EXISTS idx_hospital_users_hospital_id
  ON public.hospital_users(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_users_active
  ON public.hospital_users(user_id, is_active)
  WHERE is_active = true;

-- ==========================================
-- 3. updated_at 자동 갱신 트리거
-- ==========================================

CREATE OR REPLACE FUNCTION update_hospital_users_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_users_updated_at ON public.hospital_users;
CREATE TRIGGER trg_hospital_users_updated_at
  BEFORE UPDATE ON public.hospital_users
  FOR EACH ROW EXECUTE FUNCTION update_hospital_users_updated_at();

-- ==========================================
-- 4. RLS 정책
-- ==========================================

ALTER TABLE public.hospital_users ENABLE ROW LEVEL SECURITY;

-- 서비스 role만 전체 접근 (Admin API용)
-- anon/authenticated는 직접 테이블 접근 불가 (API route를 통해서만)

-- 병원 담당자가 자기 레코드만 조회
DROP POLICY IF EXISTS "hospital_users_select_own" ON public.hospital_users;
CREATE POLICY "hospital_users_select_own"
  ON public.hospital_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. hospital_leads에 병원별 SELECT 정책 활성화
-- ==========================================

DROP POLICY IF EXISTS "hospital_leads_select_own_hospital" ON public.hospital_leads;
CREATE POLICY "hospital_leads_select_own_hospital"
  ON public.hospital_leads
  FOR SELECT
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hu.hospital_id 
      FROM public.hospital_users hu 
      WHERE hu.user_id = auth.uid() 
        AND hu.is_active = true
    )
  );

-- 병원 담당자가 자기 병원의 리드 상태 업데이트
DROP POLICY IF EXISTS "hospital_leads_update_own_hospital" ON public.hospital_leads;
CREATE POLICY "hospital_leads_update_own_hospital"
  ON public.hospital_leads
  FOR UPDATE
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hu.hospital_id 
      FROM public.hospital_users hu 
      WHERE hu.user_id = auth.uid() 
        AND hu.is_active = true
        AND hu.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    hospital_id IN (
      SELECT hu.hospital_id 
      FROM public.hospital_users hu 
      WHERE hu.user_id = auth.uid() 
        AND hu.is_active = true
        AND hu.role IN ('owner', 'manager')
    )
  );
