-- ============================================
-- HEALO: treatment_sources (시술 출처/근거 저장)
-- ============================================
-- 목적: HOSPITAL_OFFER_IMPORT_V1 — 병원 웹사이트에서 수집한 시술의 출처(sources)와 evidence를
--       treatments.i18n에 넣지 않고 별도 테이블로 관리.
-- 선택: Option B (권장). 롤백 방법은 파일 하단 참고.
-- 날짜: 2026-02-26
-- ============================================

CREATE TABLE IF NOT EXISTS public.treatment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.treatment_sources IS '시술 데이터의 출처(URL/PDF/이미지) 및 필드별 근거(evidence). HOSPITAL_OFFER_IMPORT로 수집 시 저장.';
COMMENT ON COLUMN public.treatment_sources.sources IS '예: [{url, type: "html"|"pdf"|"image", title?}]';
COMMENT ON COLUMN public.treatment_sources.evidence IS '필드별 출처 스니펫: { "name": { "source_url", "snippet_or_ocr_text" }, ... }';
COMMENT ON COLUMN public.treatment_sources.raw_hash IS '중복 수집 방지용 원본 텍스트/페이로드 해시.';

CREATE INDEX IF NOT EXISTS idx_treatment_sources_treatment_id ON public.treatment_sources(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sources_hospital_id ON public.treatment_sources(hospital_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sources_raw_hash ON public.treatment_sources(raw_hash) WHERE raw_hash IS NOT NULL;

-- RLS: hospitals/treatments와 동일하게 service_role만 전체 접근 (Admin API에서 사용)
ALTER TABLE public.treatment_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_sources_all_service_role" ON public.treatment_sources;
CREATE POLICY "treatment_sources_all_service_role"
  ON public.treatment_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 롤백 (필요 시 실행)
-- ============================================
-- DROP POLICY IF EXISTS "Admin full access treatment_sources" ON public.treatment_sources;
-- DROP TABLE IF EXISTS public.treatment_sources;
