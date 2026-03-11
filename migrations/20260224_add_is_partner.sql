-- Add is_partner column to hospitals table
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;

-- Migrate existing partner-tagged hospitals
UPDATE hospitals SET is_partner = true WHERE tags @> ARRAY['partner'];
