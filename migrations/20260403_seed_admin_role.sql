-- Seed admin role for bonroi2296@gmail.com
-- This migration should be run after the admin user is created in Supabase Auth
--
-- To execute manually after user creation:
-- 1. Get the user_id from auth.users WHERE email = 'bonroi2296@gmail.com'
-- 2. Insert into user_roles with that user_id and role = 'admin'

-- Insert admin role for bonroi2296@gmail.com
-- Note: This assumes the user exists in auth.users
INSERT INTO user_roles (
  user_id,
  role,
  language_preference,
  is_active
)
SELECT
  id,
  'admin',
  'ko',
  true
FROM auth.users
WHERE email = 'bonroi2296@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.users.id AND role = 'admin'
  );
