/**
 * Migration: Visa Application Workflow
 *
 * 정부 요건 (KHIDI): #3, #6 — 비자발급지원 정보 제공 + 진행 관리
 *
 * 생성일: 2026-04-21
 * 적용 상태: 이미 Supabase 에 적용됨 (서브 세션에서 MCP 경유).
 *            본 파일은 버전 관리·재현용 — 신규 환경 시드 시 사용.
 *
 * 테이블 3종:
 *   - visa_applications       환자 비자 신청 진행 추적
 *   - visa_documents          서류 업로드/검수 로그
 *   - visa_status_history     상태 변경 감사 로그
 *
 * 보안:
 *   - 모든 테이블 service_role-only RLS
 *   - coordinator_notes 는 AES-256-GCM 으로 API 레이어에서 암호화 (encryptionV2)
 *
 * 사용 API:
 *   - POST   /api/khidi/visa/applications                            (환자 신청 시작)
 *   - GET    /api/khidi/visa/applications                            (목록, 권한별 스코프)
 *   - GET    /api/khidi/visa/applications/[id]                       (상세)
 *   - PATCH  /api/khidi/visa/applications/[id]                       (상태/메모/배정)
 *   - POST   /api/khidi/visa/applications/[id]/documents             (서류 업로드)
 *   - PATCH  /api/khidi/visa/applications/[id]/documents/[docId]     (검수)
 *   - POST   /api/khidi/visa/applications/[id]/invitation            (초청장 PDF 발급)
 */

-- ============================================================
-- 1) visa_applications — 비자 신청 진행 추적
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultation_sessions(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES cancer_patient_intakes(id) ON DELETE SET NULL,
  coordinator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,

  -- 비자 정보
  visa_type TEXT NOT NULL CHECK (visa_type IN ('C-3-3', 'G-1-10', 'M-1', 'other')),
  nationality TEXT NOT NULL,                        -- ISO 국적 코드 (KZ, RU, ...)
  purpose TEXT,
  duration_days INTEGER,
  planned_arrival_date DATE,
  planned_departure_date DATE,

  -- 상태 (10단계)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'documents_pending', 'under_review', 'changes_requested',
    'invitation_ready', 'invitation_issued', 'submitted_embassy',
    'approved', 'rejected', 'cancelled'
  )),

  -- 암호화된 코디 메모
  coordinator_notes_encrypted TEXT,

  -- 초청장 정보
  invitation_letter_url TEXT,
  invitation_issued_at TIMESTAMPTZ,
  invitation_issued_by UUID REFERENCES auth.users(id),

  -- 대사관 처리 추적
  embassy_submission_date DATE,
  embassy_decision_date DATE,
  visa_number TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_applications_patient
  ON public.visa_applications(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_coordinator
  ON public.visa_applications(coordinator_user_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status
  ON public.visa_applications(status);
CREATE INDEX IF NOT EXISTS idx_visa_applications_consultation
  ON public.visa_applications(consultation_id);

-- ============================================================
-- 2) visa_documents — 서류 업로드/검수
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visa_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  document_type TEXT NOT NULL,                      -- passport, photo, invitation_letter 등
  document_label TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,

  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_documents_application
  ON public.visa_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_visa_documents_review_status
  ON public.visa_documents(review_status);

-- ============================================================
-- 3) visa_status_history — 상태 변경 감사 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visa_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_status_history_application
  ON public.visa_status_history(application_id);

-- ============================================================
-- RLS — service_role 전용 (API 레이어에서만 접근)
-- ============================================================
ALTER TABLE public.visa_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_status_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='visa_applications' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.visa_applications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='visa_documents' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.visa_documents
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='visa_status_history' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.visa_status_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_visa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS visa_applications_updated_at ON public.visa_applications;
CREATE TRIGGER visa_applications_updated_at
  BEFORE UPDATE ON public.visa_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_visa_updated_at();

DROP TRIGGER IF EXISTS visa_documents_updated_at ON public.visa_documents;
CREATE TRIGGER visa_documents_updated_at
  BEFORE UPDATE ON public.visa_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_visa_updated_at();

COMMENT ON TABLE public.visa_applications   IS '환자 비자 발급 지원 신청 (정부 KHIDI 요건 #3, #6)';
COMMENT ON TABLE public.visa_documents      IS '비자 신청 서류 업로드/검수 로그';
COMMENT ON TABLE public.visa_status_history IS '비자 신청 상태 변경 감사 로그';
