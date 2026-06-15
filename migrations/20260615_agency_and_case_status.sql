-- 에이전시(환자 유치 파트너) + 케이스 진행상황 + 보험
-- 카자흐 현지 에이전시 요구: 진행 상황 가시성 + 보험 + 에이전시 전용 계정
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  code text UNIQUE,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agency_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id)
);

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS case_status text,
  ADD COLUMN IF NOT EXISTS case_status_note text,
  ADD COLUMN IF NOT EXISTS case_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_policy_no_encrypted text,
  ADD COLUMN IF NOT EXISTS insurance_coverage text,
  ADD COLUMN IF NOT EXISTS insurance_status text;

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_case_status_chk;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_case_status_chk
  CHECK (case_status IS NULL OR case_status IN
    ('received','pre_consult','hospital_review','scheduling','visa_prep','treatment','follow_up','completed','on_hold'));

CREATE TABLE IF NOT EXISTS case_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id bigint REFERENCES inquiries(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_agency ON inquiries(agency_id);
CREATE INDEX IF NOT EXISTS idx_case_status_history_inquiry ON case_status_history(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user ON agency_users(user_id);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agencies_service ON agencies;
DROP POLICY IF EXISTS agency_users_service ON agency_users;
DROP POLICY IF EXISTS case_status_history_service ON case_status_history;
CREATE POLICY agencies_service ON agencies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY agency_users_service ON agency_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY case_status_history_service ON case_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
