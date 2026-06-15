-- 기관별 성과 집계: 참여기관(한방)·협진(대학병원)별 상담/사후관리 건수
-- 중간평가 참여기관별 지표(원격 사후관리 등) 자동 집계용
CREATE OR REPLACE FUNCTION conversion_funnel_by_org(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(
  hospital_id uuid,
  hospital_name text,
  kind text,
  total_sessions bigint,
  pre_consult bigint,
  followup bigint,
  completed bigint
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    h.id,
    COALESCE(h.name, '(미지정)'),
    CASE WHEN h.slug LIKE 'immunehospital%' THEN '한방(참여기관)'
         WHEN h.id IS NULL THEN '미지정'
         ELSE '대학병원(협진)' END AS kind,
    count(*)::bigint,
    count(*) FILTER (WHERE c.session_type='pre_consultation' AND c.status='completed')::bigint,
    count(*) FILTER (WHERE c.session_type='follow_up' AND c.status='completed')::bigint,
    count(*) FILTER (WHERE c.status='completed')::bigint
  FROM consultation_sessions c
  LEFT JOIN hospitals h ON h.id = c.hospital_id
  WHERE c.created_at >= p_from AND c.created_at < p_to
  GROUP BY h.id, h.name, h.slug
  ORDER BY count(*) DESC;
$$;
