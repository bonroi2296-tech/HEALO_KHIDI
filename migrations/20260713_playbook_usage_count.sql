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

-- 스레드당 패턴 1건 보장 — 어드민 resolve + 포털 PATCH 가 동시에 resolve 할 때
-- 워커의 check-then-insert 레이스로 중복 삽입되는 걸 DB 가 봉쇄(독립리뷰 #738 지적).
-- 현재 테이블 0건이라 기존 데이터 충돌 없음.
CREATE UNIQUE INDEX IF NOT EXISTS uq_playbook_patterns_source_thread
  ON public.playbook_patterns (source_thread_id)
  WHERE source_thread_id IS NOT NULL;
