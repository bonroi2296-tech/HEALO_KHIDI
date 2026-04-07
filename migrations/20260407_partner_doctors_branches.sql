-- ============================================================
-- Partner Branches & Doctors CRUD tables
-- Supports admin management of partner hospital branches and doctors
-- ============================================================

-- 1. Partner Branches
CREATE TABLE IF NOT EXISTS partner_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_code text UNIQUE NOT NULL,           -- e.g. 'gangseo', 'sinchon', 'gwangmyeong', 'seongdong'
  name_ko text NOT NULL,                       -- e.g. '면력한방병원 강서점'
  name_en text,                                -- e.g. 'Immunehospital Gangseo'
  address_ko text,
  address_en text,
  phone text,
  status text NOT NULL DEFAULT 'registered',   -- 'registered', 'preparing', 'upcoming'
  i18n jsonb NOT NULL DEFAULT '{}',            -- { ru: { name: "...", address: "..." }, zh: {...} }
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Partner Doctors
CREATE TABLE IF NOT EXISTS partner_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES partner_branches(id) ON DELETE CASCADE,
  name_ko text NOT NULL,                       -- Korean name
  name_en text,                                -- English name
  position_ko text,                            -- e.g. '대표원장'
  position_en text,                            -- e.g. 'Chief Director'
  photo_url text,                              -- Detail page photo (larger)
  listing_photo_url text,                      -- Listing card photo
  subspecialty text,                           -- e.g. '통합면역 대표원장'
  career text[] NOT NULL DEFAULT '{}',         -- 경력 array
  education text[] NOT NULL DEFAULT '{}',      -- 학력 array
  activities text[] NOT NULL DEFAULT '{}',     -- 활동 array
  publications text[] NOT NULL DEFAULT '{}',   -- 저서 및 논문 array
  keywords text[] NOT NULL DEFAULT '{}',       -- e.g. '#꼼꼼한', '#친절한'
  i18n jsonb NOT NULL DEFAULT '{}',            -- { en: { name: "...", position: "..." }, ru: {...} }
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_doctors_branch ON partner_doctors(branch_id);
CREATE INDEX IF NOT EXISTS idx_partner_doctors_active ON partner_doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_branches_status ON partner_branches(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_partner_branches ON partner_branches;
CREATE TRIGGER set_updated_at_partner_branches
  BEFORE UPDATE ON partner_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_partner_doctors ON partner_doctors;
CREATE TRIGGER set_updated_at_partner_doctors
  BEFORE UPDATE ON partner_doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE partner_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_doctors ENABLE ROW LEVEL SECURITY;

-- Public read access (for frontend)
CREATE POLICY "partner_branches_public_read" ON partner_branches
  FOR SELECT USING (true);
CREATE POLICY "partner_doctors_public_read" ON partner_doctors
  FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "partner_branches_admin_all" ON partner_branches
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );
CREATE POLICY "partner_doctors_admin_all" ON partner_doctors
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );
