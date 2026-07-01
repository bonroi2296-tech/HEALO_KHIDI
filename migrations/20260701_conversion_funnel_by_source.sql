-- 채널(유입경로)별 전환 집계: web(문의폼) vs ai_agent(AI 상담) 등 inquiries.source 별로
-- 어느 유입 채널이 실제 유치로 이어지는지 비교(중간평가 유치 12건의 채널 기여 분석용).
-- conversion_funnel_by_country 와 동일 패턴, GROUP BY 만 source 로.
CREATE OR REPLACE FUNCTION conversion_funnel_by_source(
  p_from timestamptz, p_to timestamptz, p_include_test boolean DEFAULT false
)
RETURNS TABLE(source text, total bigint, pre_consult bigint, admitted bigint, followup bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(i.source,'(미상)') AS source,
    count(*)::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed'))::bigint,
    count(*) FILTER (WHERE i.outcome='admitted')::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed'))::bigint
  FROM inquiries i
  WHERE i.created_at >= p_from AND i.created_at < p_to
    AND (p_include_test OR i.is_test = false)
  GROUP BY COALESCE(i.source,'(미상)')
  ORDER BY count(*) DESC;
$$;
