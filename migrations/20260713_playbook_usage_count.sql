-- 코디 답장 추천 칩(2026-07-13): 패턴 사용 횟수 — 많이 쓴 "단골" 패턴을 위로 정렬.
-- 가역적 변경(컬럼·함수 추가만). 되돌리기: DROP COLUMN usage_count; DROP FUNCTION increment_pattern_usage;

ALTER TABLE public.playbook_patterns
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;

-- 원자적 증가(읽고-쓰기 경쟁 방지). 호출은 service_role(서버 API) 전용.
CREATE OR REPLACE FUNCTION public.increment_pattern_usage(p_pattern_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.playbook_patterns
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = p_pattern_id;
$$;

REVOKE ALL ON FUNCTION public.increment_pattern_usage(uuid) FROM PUBLIC, anon, authenticated;
