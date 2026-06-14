-- 유치 전환 깔때기 집계 RPC (자동 신호 조인): 문의→사전상담→견적/비자→유치확정→사후관리
CREATE OR REPLACE FUNCTION conversion_funnel(p_from timestamptz, p_to timestamptz, p_nationality text DEFAULT NULL)
RETURNS TABLE(total_inquiries bigint, pre_consult bigint, visa_or_quote bigint, admitted bigint, followup bigint, lost bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH inq AS (
    SELECT i.id, i.outcome,
      EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed') AS pre_done,
      EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed') AS followup_done,
      EXISTS(SELECT 1 FROM cost_estimates e JOIN consultation_sessions c ON c.id=e.consultation_id WHERE c.inquiry_id=i.id AND e.quotation_issued_at IS NOT NULL) AS quote_done,
      EXISTS(SELECT 1 FROM visa_applications v JOIN consultation_sessions c ON c.id=v.consultation_id WHERE c.inquiry_id=i.id) AS visa_done
    FROM inquiries i
    WHERE i.created_at >= p_from AND i.created_at < p_to AND (p_nationality IS NULL OR i.nationality = p_nationality)
  )
  SELECT count(*)::bigint, count(*) FILTER (WHERE pre_done)::bigint, count(*) FILTER (WHERE quote_done OR visa_done)::bigint,
    count(*) FILTER (WHERE outcome='admitted')::bigint, count(*) FILTER (WHERE followup_done)::bigint, count(*) FILTER (WHERE outcome='lost')::bigint
  FROM inq;
$$;

CREATE OR REPLACE FUNCTION conversion_funnel_by_country(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(nationality text, total bigint, pre_consult bigint, admitted bigint, followup bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(i.nationality,'(미상)'),
    count(*)::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed'))::bigint,
    count(*) FILTER (WHERE i.outcome='admitted')::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed'))::bigint
  FROM inquiries i
  WHERE i.created_at >= p_from AND i.created_at < p_to
  GROUP BY COALESCE(i.nationality,'(미상)') ORDER BY count(*) DESC;
$$;
