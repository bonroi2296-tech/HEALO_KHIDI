/**
 * Migration: Cost Estimate Workflow (3-Tier)
 *
 * 정부 요건 (KHIDI): #3, #6 — 예상진료비 산출내역 온라인 안내·제공
 *
 * 생성일: 2026-04-21
 * 적용 상태: 이미 Supabase 에 적용됨 (서브 세션에서 MCP 경유).
 *            본 파일은 버전 관리·재현용.
 *
 * 3-Tier 설계:
 *   Tier 1: treatment_cost_benchmarks  룰 기반 자동 범위 (공개 SELECT)
 *   Tier 2: AI 보정 (Gemini, stateless — 별도 테이블 없음)
 *   Tier 3: cost_estimates             정식 견적서 워크플로우 + §15 동의 기록
 *
 * 전제 함수: public.update_visa_updated_at()
 *   visa 마이그레이션(20260421_visa_application_workflow.sql)에서 선정의. 반드시 먼저 적용.
 *
 * 사용 API:
 *   - GET    /api/khidi/cost-estimate                                  (Tier 1 공개)
 *   - POST   /api/khidi/cost-estimate                                  (Tier 2 Gemini)
 *   - POST   /api/khidi/cost-estimates                                 (Tier 3 정식 요청)
 *   - GET    /api/khidi/cost-estimates                                 (목록 권한별)
 *   - GET/PATCH /api/khidi/cost-estimates/[id]                         (상세·상태·동의)
 *   - POST   /api/khidi/cost-estimates/[id]/quotation                  (PDF 발급)
 */

-- ============================================================
-- 1) treatment_cost_benchmarks — Tier 1 자동 범위 벤치마크
-- ============================================================
CREATE TABLE IF NOT EXISTS public.treatment_cost_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cancer_type TEXT NOT NULL CHECK (cancer_type IN (
    'stomach', 'liver', 'lung', 'breast', 'thyroid', 'colorectal', 'other'
  )),
  stage TEXT NOT NULL CHECK (stage IN ('1', '2', '3', '4', 'unknown')),
  treatment_phase TEXT NOT NULL CHECK (treatment_phase IN (
    'pre_treatment', 'during_treatment', 'post_treatment'
  )),

  procedures JSONB DEFAULT '[]'::jsonb,

  min_krw BIGINT NOT NULL,
  median_krw BIGINT NOT NULL,
  max_krw BIGINT NOT NULL,
  min_usd INTEGER,
  median_usd INTEGER,
  max_usd INTEGER,

  source TEXT,
  sample_size INTEGER,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_benchmark_key
  ON public.treatment_cost_benchmarks(cancer_type, stage, treatment_phase);
CREATE INDEX IF NOT EXISTS idx_cost_benchmark_cancer
  ON public.treatment_cost_benchmarks(cancer_type);

-- ============================================================
-- 2) cost_estimates — Tier 3 정식 견적서
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultation_sessions(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES cancer_patient_intakes(id) ON DELETE SET NULL,
  coordinator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,

  -- Tier 1 자동 추정 기록
  auto_min_krw BIGINT,
  auto_median_krw BIGINT,
  auto_max_krw BIGINT,
  ai_personalization TEXT,                         -- Tier 2 Gemini 보정 메모

  -- Tier 3 정식 견적 본체
  quotation_items JSONB DEFAULT '[]'::jsonb,       -- [{label, note, krw, usd}, ...]
  total_krw BIGINT,
  total_usd INTEGER,
  quotation_no TEXT,
  quotation_pdf_url TEXT,
  quotation_issued_at TIMESTAMPTZ,
  quotation_issued_by UUID REFERENCES auth.users(id),

  status TEXT NOT NULL DEFAULT 'auto_range' CHECK (status IN (
    'auto_range', 'formal_requested', 'hospital_pending', 'draft',
    'issued', 'accepted', 'rejected', 'expired'
  )),

  coordinator_notes_encrypted TEXT,

  -- 의료해외진출법 §15 환자 동의 증거
  patient_accepted_at TIMESTAMPTZ,
  patient_accepted_ip TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cost_estimates_patient
  ON public.cost_estimates(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_coordinator
  ON public.cost_estimates(coordinator_user_id);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_status
  ON public.cost_estimates(status);
CREATE INDEX IF NOT EXISTS idx_cost_estimates_consultation
  ON public.cost_estimates(consultation_id);

-- ============================================================
-- 3) cost_estimate_history — 상태 변경 감사 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cost_estimate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_estimate_history_estimate
  ON public.cost_estimate_history(estimate_id);

-- ============================================================
-- RLS
--   treatment_cost_benchmarks: anon/authenticated 공개 SELECT (참조 데이터)
--   cost_estimates / history : service_role 전용 (API 경유)
-- ============================================================
ALTER TABLE public.treatment_cost_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_history     ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='treatment_cost_benchmarks' AND policyname='public_select') THEN
    CREATE POLICY public_select ON public.treatment_cost_benchmarks
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='treatment_cost_benchmarks' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.treatment_cost_benchmarks
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cost_estimates' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.cost_estimates
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cost_estimate_history' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.cost_estimate_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- updated_at 트리거 (함수는 visa 마이그레이션에서 정의됨)
-- ============================================================
DROP TRIGGER IF EXISTS treatment_cost_benchmarks_updated_at ON public.treatment_cost_benchmarks;
CREATE TRIGGER treatment_cost_benchmarks_updated_at
  BEFORE UPDATE ON public.treatment_cost_benchmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_visa_updated_at();

DROP TRIGGER IF EXISTS cost_estimates_updated_at ON public.cost_estimates;
CREATE TRIGGER cost_estimates_updated_at
  BEFORE UPDATE ON public.cost_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_visa_updated_at();

COMMENT ON TABLE public.treatment_cost_benchmarks IS 'Tier 1 즉시 범위 산출용 벤치마크 (KHIDI 통계 + 과거 견적)';
COMMENT ON TABLE public.cost_estimates            IS 'Tier 3 정식 견적서 — 의료해외진출법 §15 준수';
COMMENT ON TABLE public.cost_estimate_history     IS '견적 상태 변경 감사 로그';
