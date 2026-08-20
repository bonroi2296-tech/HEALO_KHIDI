-- 견적 요청에 「무엇을」이 없었다 (2026-08-20)
-- 환자가 요청 폼에서 고른 암종·병기가 저장되지 않아, 코디네이터는 환자가 무슨 암 몇 기인지
-- 모르는 채로 병원에 금액을 물어야 했다. 고른 값은 출처 없는 자동 범위를 조회하는 데만
-- 쓰이고 버려졌다.
ALTER TABLE public.cost_estimates
  ADD COLUMN IF NOT EXISTS cancer_type TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT;

COMMENT ON COLUMN public.cost_estimates.cancer_type IS '환자가 견적 요청 시 고른 암종. 코디네이터가 병원에 문의할 대상.';
COMMENT ON COLUMN public.cost_estimates.stage IS '환자가 견적 요청 시 고른 병기(1~4 또는 unknown).';
