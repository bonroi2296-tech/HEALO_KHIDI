-- site_settings 누락 컬럼 추가 (400 에러 방지)
-- hero_background_url 등 기본 마이그레이션에 있는 컬럼은 이미 있음.
-- 확장 컬럼이 없을 수 있는 DB용.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_background_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS site_name text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_title text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_subtitle text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS primary_color text;
