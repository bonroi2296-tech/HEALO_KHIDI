-- ============================================
-- HEALO: inquiries.status 영어 통일
-- ============================================
-- 목적: 한글 status 값 → 영어로 통일, CHECK 제약 업데이트
-- 날짜: 2026-02-26
-- ============================================

-- 1. 기존 CHECK 제약 삭제 (제약명 확인 필요)
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;

-- 2. 한글/혼용 → 영어 매핑
UPDATE public.inquiries
SET status = 'pending'
WHERE status IN ('대기중', 'pending');

UPDATE public.inquiries
SET status = 'completed'
WHERE status = '완료';

UPDATE public.inquiries
SET status = 'received'
WHERE status IS NULL OR status = '';

-- 3. 허용값: pending, received, completed, blocked, normalized, error
ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('pending', 'received', 'completed', 'blocked', 'normalized', 'error'));

COMMENT ON COLUMN public.inquiries.status IS '문의 상태 (영어만): pending(대기), received(수신), completed(완료), blocked(차단), normalized(정규화완료), error(에러)';
