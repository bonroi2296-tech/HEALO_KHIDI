-- RPC functions for crawl schedule (bypasses PostgREST schema cache)

CREATE OR REPLACE FUNCTION get_crawl_schedule()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT crawl_schedule INTO result FROM site_settings LIMIT 1;
  RETURN COALESCE(result, '{"enabled": false, "frequency": "monthly", "sources": ["hira"], "last_auto_run": null}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_crawl_schedule(p_schedule jsonb)
RETURNS jsonb AS $$
DECLARE
  existing_id bigint;
BEGIN
  SELECT id INTO existing_id FROM site_settings LIMIT 1;
  IF existing_id IS NOT NULL THEN
    UPDATE site_settings SET crawl_schedule = p_schedule WHERE id = existing_id;
  ELSE
    INSERT INTO site_settings (crawl_schedule) VALUES (p_schedule);
  END IF;
  RETURN p_schedule;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
