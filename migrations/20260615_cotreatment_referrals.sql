-- 양·한방 협진 의뢰/회신 워크플로우 (한방 참여기관 → 대학병원 협진)
-- 협진 의뢰서 증빙 + 협진율 지표 산출용
CREATE TABLE IF NOT EXISTS cotreatment_referrals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id bigint REFERENCES inquiries(id) ON DELETE SET NULL,
  from_hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,  -- 한방(참여기관)
  to_hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,    -- 대학병원(협진)
  reason text,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','accepted','completed','declined','cancelled')),
  result_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cotreatment_referrals_status ON cotreatment_referrals(status);
CREATE INDEX IF NOT EXISTS idx_cotreatment_referrals_inquiry ON cotreatment_referrals(inquiry_id);

ALTER TABLE cotreatment_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cotreatment_referrals_service ON cotreatment_referrals;
CREATE POLICY cotreatment_referrals_service ON cotreatment_referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
