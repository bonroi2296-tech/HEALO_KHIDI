-- 2026-06-30: funnel_events 표 라이브 적용 + RLS
--
-- 배경: migrations/20260129_add_lead_quality_and_events.sql 는 §1(inquiries 컬럼)만
-- 라이브에 적용됐고 §2(funnel_events)·§3(operational_alerts) 표는 누락돼 있었다.
-- 그래서 trackFunnelEvent() 의 insert 가 살아 있어도 받을 표가 없어 데이터가 0이었다.
-- 이 파일은 funnel_events 만 라이브에 맞춰 적용한 기록(operational_alerts 는 범위 밖, 별도).
--
-- 원본 20260129 에 없던 보강:
--  - RLS 활성(서비스롤 전용 — kpi_snapshots·surveys 등 운영표와 동일 패턴)
--  - v_today_funnel_stats 뷰를 security_invoker 로 (SECURITY DEFINER 의 RLS 우회 차단)
-- 모두 멱등(IF NOT EXISTS / ENABLE RLS 재실행 안전).

-- 표 본체·인덱스·뷰는 20260129 §2 와 동일 (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS funnel_events (
  id BIGSERIAL PRIMARY KEY,
  stage TEXT NOT NULL CHECK (stage IN (
    'page_view', 'form_start', 'form_step1_submit', 'form_step2_view',
    'form_step2_submit', 'form_complete', 'form_blocked', 'form_error',
    'chat_start', 'chat_message', 'chat_blocked', 'chat_error'
  )),
  session_id TEXT,
  page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  language TEXT,
  country TEXT,
  treatment_type TEXT,
  duration INTEGER,
  drop_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_stage ON funnel_events(stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id, created_at) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_events_utm_source ON funnel_events(utm_source, created_at) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON funnel_events(created_at DESC);

COMMENT ON TABLE funnel_events IS '퍼널 이벤트 추적 (전환율 계측용)';

-- 서비스롤(supabaseAdmin)만 적재/조회. anon/authenticated 는 정책 부재로 차단(서비스롤은 RLS 우회).
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW v_today_funnel_stats AS
SELECT
  stage,
  COUNT(*) AS count,
  COUNT(*) * 100.0 / NULLIF((
    SELECT COUNT(*) FROM funnel_events
    WHERE stage = 'page_view' AND created_at > CURRENT_DATE
  ), 0) AS conversion_rate
FROM funnel_events
WHERE created_at > CURRENT_DATE
GROUP BY stage
ORDER BY
  CASE stage
    WHEN 'page_view' THEN 1
    WHEN 'form_start' THEN 2
    WHEN 'form_step1_submit' THEN 3
    WHEN 'form_step2_view' THEN 4
    WHEN 'form_step2_submit' THEN 5
    WHEN 'form_complete' THEN 6
    WHEN 'form_blocked' THEN 7
    WHEN 'form_error' THEN 8
    WHEN 'chat_start' THEN 9
    WHEN 'chat_message' THEN 10
    WHEN 'chat_blocked' THEN 11
    WHEN 'chat_error' THEN 12
  END;

-- 뷰가 호출자 권한·RLS 를 따르게 (SECURITY DEFINER 우회 차단)
ALTER VIEW public.v_today_funnel_stats SET (security_invoker = on);

COMMENT ON VIEW v_today_funnel_stats IS '오늘의 퍼널 전환율 통계';
