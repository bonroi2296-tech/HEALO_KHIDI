-- HEALO: Hospital Leads Management
-- 
-- 목적:
-- - 병원별 리드 할당 및 응답 추적
-- - 100개 병원으로 확장 준비
-- - normalized_inquiries와 hospitals 연결
-- 
-- 실행 방법:
-- Supabase Dashboard > SQL Editor에서 실행

-- ==========================================
-- 1. hospital_leads 테이블 생성
-- ==========================================

CREATE TABLE IF NOT EXISTS public.hospital_leads (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Foreign keys
  normalized_inquiry_id uuid NOT NULL REFERENCES public.normalized_inquiries(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'viewed', 'replied', 'converted', 'rejected', 'expired')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  first_response_at timestamptz,
  last_status_at timestamptz NOT NULL DEFAULT now(),
  
  -- Pricing
  quoted_price_min numeric,
  quoted_price_max numeric,
  
  -- Additional data
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT unique_inquiry_hospital UNIQUE(normalized_inquiry_id, hospital_id),
  CONSTRAINT valid_price_range CHECK (
    quoted_price_min IS NULL 
    OR quoted_price_max IS NULL 
    OR quoted_price_min <= quoted_price_max
  )
);

-- ==========================================
-- 2. Indexes (성능 최적화)
-- ==========================================

-- 병원별 리드 조회 (가장 자주 사용)
CREATE INDEX IF NOT EXISTS idx_hospital_leads_hospital_status 
  ON public.hospital_leads(hospital_id, status, assigned_at DESC);

-- Inquiry별 할당된 병원 조회
CREATE INDEX IF NOT EXISTS idx_hospital_leads_inquiry 
  ON public.hospital_leads(normalized_inquiry_id);

-- Status별 조회 (대시보드용)
CREATE INDEX IF NOT EXISTS idx_hospital_leads_status 
  ON public.hospital_leads(status, assigned_at DESC);

-- 최근 활동 조회
CREATE INDEX IF NOT EXISTS idx_hospital_leads_updated 
  ON public.hospital_leads(updated_at DESC);

-- ==========================================
-- 3. Auto-update trigger for updated_at
-- ==========================================

-- Function: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.update_hospital_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: UPDATE 시 updated_at 자동 갱신
DROP TRIGGER IF EXISTS trigger_hospital_leads_updated_at ON public.hospital_leads;
CREATE TRIGGER trigger_hospital_leads_updated_at
  BEFORE UPDATE ON public.hospital_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hospital_leads_updated_at();

-- ==========================================
-- 4. RLS (Row Level Security) 정책
-- ==========================================

-- RLS 활성화
ALTER TABLE public.hospital_leads ENABLE ROW LEVEL SECURITY;

-- ❌ anon/authenticated: 모든 접근 거부 (기본값)
-- 주석: 필요시 병원별 읽기 정책 추가 가능
-- CREATE POLICY "hospital_leads_select_own_hospital"
--   ON public.hospital_leads
--   FOR SELECT
--   TO authenticated
--   USING (
--     auth.jwt() ->> 'email' IN (
--       SELECT contact_email FROM public.hospitals WHERE id = hospital_leads.hospital_id
--     )
--   );

-- ✅ service_role: 모든 작업 허용 (Admin API 전용)
CREATE POLICY "hospital_leads_all_service_role"
  ON public.hospital_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- 5. Comments (문서화)
-- ==========================================

COMMENT ON TABLE public.hospital_leads IS 
  '병원별 리드 할당 및 응답 추적 테이블. normalized_inquiries와 hospitals를 연결하여 각 병원의 응답 상태를 관리합니다.';

COMMENT ON COLUMN public.hospital_leads.status IS 
  '리드 상태: queued(대기), sent(발송), viewed(조회), replied(응답), converted(전환), rejected(거부), expired(만료)';

COMMENT ON COLUMN public.hospital_leads.assigned_at IS 
  '병원에 리드가 할당된 시각';

COMMENT ON COLUMN public.hospital_leads.first_response_at IS 
  '병원이 처음 응답한 시각 (status가 replied로 변경될 때 자동 설정)';

COMMENT ON COLUMN public.hospital_leads.last_status_at IS 
  '마지막으로 status가 변경된 시각';

COMMENT ON COLUMN public.hospital_leads.metadata IS 
  '추가 메타데이터 (JSON): 병원별 커스텀 필드, 외부 시스템 ID 등';

-- ==========================================
-- 6. 검증 쿼리 (실행 후 확인용)
-- ==========================================

-- 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'hospital_leads'
-- ORDER BY ordinal_position;

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'hospital_leads';

-- Indexes 확인
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'hospital_leads';

-- ==========================================
-- 7. 샘플 데이터 (테스트용, 선택)
-- ==========================================

-- 주석: 실제 데이터가 있을 때 테스트
-- INSERT INTO public.hospital_leads (
--   normalized_inquiry_id,
--   hospital_id,
--   status,
--   quoted_price_min,
--   quoted_price_max,
--   notes
-- )
-- SELECT 
--   (SELECT id FROM public.normalized_inquiries LIMIT 1),
--   (SELECT id FROM public.hospitals LIMIT 1),
--   'sent',
--   3000,
--   5000,
--   'Test lead assignment'
-- WHERE EXISTS (SELECT 1 FROM public.normalized_inquiries)
--   AND EXISTS (SELECT 1 FROM public.hospitals);

-- ==========================================
-- Migration 완료
-- ==========================================
-- 
-- 다음 단계:
-- 1. Admin API 생성: /api/admin/leads/*
-- 2. Admin UI 생성: /app/admin/leads
-- 3. 병원에 리드 할당 로직 구현
