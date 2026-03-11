-- ============================================================
-- RAG Health Observability: DB-side aggregation (no bulk fetch)
--
-- rag_health_aggregates(p_since): GROUP BY 집계만 수행, JSON 반환.
-- /api/admin/observability/rag/health 에서 호출.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rag_health_aggregates(p_since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_requests bigint := 0;
  by_status jsonb := '{}';
  lang_breakdown jsonb := '[]';
  source_breakdown jsonb := '[]';
  daily_trend jsonb := '[]';
  top_5_sources jsonb := '[]';
  result jsonb;
BEGIN
  SELECT count(*) INTO total_requests FROM rag_query_events WHERE created_at >= p_since;

  SELECT jsonb_build_object(
    'ok', coalesce(sum(CASE WHEN status = 'ok' THEN 1 ELSE 0 END), 0)::bigint,
    'zero_results', coalesce(sum(CASE WHEN status = 'zero_results' THEN 1 ELSE 0 END), 0)::bigint,
    'embedding_failed', coalesce(sum(CASE WHEN status = 'embedding_failed' THEN 1 ELSE 0 END), 0)::bigint,
    'rpc_failed', coalesce(sum(CASE WHEN status = 'rpc_failed' THEN 1 ELSE 0 END), 0)::bigint
  ) INTO by_status
  FROM rag_query_events
  WHERE created_at >= p_since;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'lang', lang,
        'total', total,
        'zero_count', zero_count,
        'zero_rate', round((zero_count::numeric / nullif(total, 0) * 1000) / 10, 1)
      ) ORDER BY total DESC
    ),
    '[]'::jsonb
  ) INTO lang_breakdown
  FROM (
    SELECT
      lang,
      count(*)::bigint total,
      sum(CASE WHEN status = 'zero_results' THEN 1 ELSE 0 END)::bigint zero_count
    FROM rag_query_events
    WHERE created_at >= p_since
    GROUP BY lang
  ) t;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', source,
        'total', total,
        'zero_count', zero_count,
        'zero_rate', round((zero_count::numeric / nullif(total, 0) * 1000) / 10, 1)
      ) ORDER BY total DESC
    ),
    '[]'::jsonb
  ) INTO source_breakdown
  FROM (
    SELECT
      source,
      count(*)::bigint total,
      sum(CASE WHEN status = 'zero_results' THEN 1 ELSE 0 END)::bigint zero_count
    FROM rag_query_events
    WHERE created_at >= p_since
    GROUP BY source
  ) t;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(day, 'YYYY-MM-DD'),
        'total', total,
        'zero_count', zero_count,
        'zero_rate', round((zero_count::numeric / nullif(total, 0) * 1000) / 10, 1)
      ) ORDER BY day ASC
    ),
    '[]'::jsonb
  ) INTO daily_trend
  FROM (
    SELECT
      date_trunc('day', created_at) AS day,
      count(*)::bigint total,
      sum(CASE WHEN status = 'zero_results' THEN 1 ELSE 0 END)::bigint zero_count
    FROM rag_query_events
    WHERE created_at >= p_since
    GROUP BY date_trunc('day', created_at)
  ) t;

  -- top_5_sources_by_zero_rate: total >= 3, zero_rate 상위 5 source
  SELECT coalesce(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'source', source,
        'total', total,
        'zero_count', zero_count,
        'zero_rate', zero_rate
      )
    ) FROM (
      SELECT
        source,
        total,
        zero_count,
        round((zero_count::numeric / nullif(total, 0) * 1000) / 10, 1) AS zero_rate
      FROM (
        SELECT
          source,
          count(*)::bigint total,
          sum(CASE WHEN status = 'zero_results' THEN 1 ELSE 0 END)::bigint zero_count
        FROM rag_query_events
        WHERE created_at >= p_since
        GROUP BY source
      ) sub
      WHERE total >= 3
      ORDER BY (zero_count::numeric / nullif(total, 0)) DESC NULLS LAST
      LIMIT 5
    ) top),
    '[]'::jsonb
  ) INTO top_5_sources;

  result := jsonb_build_object(
    'total_requests', total_requests,
    'by_status', by_status,
    'lang_breakdown', lang_breakdown,
    'source_breakdown', source_breakdown,
    'daily_trend', daily_trend,
    'top_5_sources_by_zero_rate', top_5_sources
  );
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.rag_health_aggregates(timestamptz) IS
  'RAG health KPIs by GROUP BY. Used by /api/admin/observability/rag/health. No bulk row fetch.';
