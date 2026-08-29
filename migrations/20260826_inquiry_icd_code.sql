-- 케이스에 진단코드를 붙일 자리가 없었다 (2026-08-26)
-- 환자가 의뢰서에 적은 코드는 intake_data(jsonb) 안에만 있고, 의뢰서를 안 낸 케이스에는
-- 코드를 넣을 데가 아예 없었다. 실서비스 문의 8건 중 코드가 들어간 건 0건.
-- 코디가 확정한 코드를 담을 칸을 따로 둔다(환자 자가 신고와 코디 확정은 다른 값이다).
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS icd_code TEXT,
  ADD COLUMN IF NOT EXISTS icd_code_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS icd_code_updated_by TEXT;

COMMENT ON COLUMN public.inquiries.icd_code IS
  'ICD-10 진단코드. 코디가 확정해 넣는 값이며 환자가 의뢰서에 적은 intake_data.icdCode 보다 우선한다. 병원 의뢰 서류에 쓰인다.';
COMMENT ON COLUMN public.inquiries.icd_code_updated_at IS '진단코드를 마지막으로 넣거나 고친 시각.';
COMMENT ON COLUMN public.inquiries.icd_code_updated_by IS '진단코드를 마지막으로 고친 staff 의 이메일.';
