-- ==========================================
-- HEALO: site_settings 테이블 생성
-- ==========================================
-- 목적: 사이트 브랜딩 설정 (로고, 히어로 배경) 관리
-- 작성일: 2026-02-04
-- ==========================================

-- 1. site_settings 테이블 생성
CREATE TABLE IF NOT EXISTS public.site_settings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 브랜딩 이미지 URL
  logo_url text,
  hero_background_url text,
  
  -- 추가 설정 (향후 확장용)
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. 코멘트 추가
COMMENT ON TABLE public.site_settings IS '사이트 브랜딩 설정 (로고, 히어로 배경 등)';
COMMENT ON COLUMN public.site_settings.logo_url IS '헤더 로고 이미지 URL (Supabase Storage)';
COMMENT ON COLUMN public.site_settings.hero_background_url IS '홈페이지 히어로 섹션 배경 이미지 URL';
COMMENT ON COLUMN public.site_settings.metadata IS '추가 설정 JSON (향후 확장용)';

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_settings_updated_at();

-- 4. RLS 활성화
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책
-- 모든 사용자가 읽기 가능 (공개 설정)
CREATE POLICY "Anyone can read site_settings"
ON public.site_settings
FOR SELECT
USING (true);

-- 관리자만 쓰기 가능 (service_role은 RLS 우회)
CREATE POLICY "Admin can write site_settings"
ON public.site_settings
FOR ALL
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'
  )
);

-- 6. 기본 row 삽입 (선택)
-- 테이블에 row가 없으면 기본값 삽입
INSERT INTO public.site_settings (logo_url, hero_background_url)
SELECT NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- ==========================================
-- 완료
-- ==========================================
-- 실행 후 확인:
-- SELECT * FROM public.site_settings;
-- ==========================================
