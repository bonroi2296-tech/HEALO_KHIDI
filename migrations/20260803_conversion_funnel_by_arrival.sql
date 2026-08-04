-- 「유입」별 전환 집계 (2026-08-03) — 20260803_inquiry_arrival.sql 이 만든 네 칸을 세는 함수.
--
-- 기존 conversion_funnel_by_source 와 다른 축이다: 저건 우리 «안»의 채널(웹 문의폼 / AI 상담)을
-- 가르고, 이건 «밖»에서 어떻게 왔는지를 가른다 — 어느 언어 화면·어디서·어느 페이지.
--
-- 왜 필요: 6개 언어와 콘텐츠에 품을 들였는데 그게 문의를 데려왔는지 셀 방법이 없었다.
-- 축(p_axis) 하나로 세 관점을 돌려쓴다 — 표가 셋이면 화면만 길어지고 보는 눈은 같다.
--   locale   = 문의한 화면의 언어      → 다국어 투자가 실적이 됐나
--   referrer = 어디서 넘어왔나          → 검색 / 에이전시 / 광고 / 직접
--   landing  = 처음 들어온 페이지       → 어느 콘텐츠가 문의를 만드나
--
-- conversion_funnel_by_source 와 같은 패턴(같은 열·같은 필터) — 화면에서 표를 그대로 재사용한다.

CREATE OR REPLACE FUNCTION conversion_funnel_by_arrival(
  p_from timestamptz,
  p_to timestamptz,
  p_include_test boolean DEFAULT false,
  p_axis text DEFAULT 'locale'
)
RETURNS TABLE(bucket text, total bigint, pre_consult bigint, admitted bigint, followup bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    CASE p_axis
      WHEN 'referrer' THEN COALESCE(i.referrer_host, '(직접 방문)')
      WHEN 'landing'  THEN COALESCE(i.landing_path,  '(기록 없음)')
      ELSE                 COALESCE(i.source_locale, '(기록 없음)')
    END AS bucket,
    count(*)::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed'))::bigint,
    count(*) FILTER (WHERE i.outcome='admitted')::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed'))::bigint
  FROM inquiries i
  WHERE i.created_at >= p_from AND i.created_at < p_to
    AND (p_include_test OR i.is_test = false)
  GROUP BY 1
  ORDER BY count(*) DESC;
$$;
