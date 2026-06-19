-- 운영 알림 임계 카운터 DB 이관 (서버리스 콜드스타트 리셋 해소)
--
-- 왜: src/lib/alerts/operationalAlerts.ts 의 AlertCounter 가 인메모리라
--     Vercel isolate 마다 독립 → "5분 내 N건" 류 누적 임계가 단일 인스턴스
--     안에서만 정확. 분산 환경에서 임계 도달을 놓침. DB sliding window 로 이관.
--     (개별 알림 전송 sendAlert 는 정상 — 누적 집계만 부정확했음.)
--
-- 멱등(재실행 안전): IF NOT EXISTS / CREATE OR REPLACE 만 사용.
-- 보안: RLS enable + 정책 없음 = anon/authenticated 거부, service_role 만 접근(우회).
--       RPC 는 service_role(supabaseAdmin)에서만 호출.

-- ── 1) append-only 이벤트 테이블 ──
CREATE TABLE IF NOT EXISTS public.alert_counter_events (
  id          bigserial PRIMARY KEY,
  counter_key text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_counter_events_key_time
  ON public.alert_counter_events (counter_key, created_at DESC);

ALTER TABLE public.alert_counter_events ENABLE ROW LEVEL SECURITY;
-- (정책 없음 = service_role 외 전면 거부)

-- ── 2) sliding-window 증가 RPC ──
-- 이벤트 1건 insert → 오래된 행 정리(24h) → 윈도우 내 카운트 반환.
-- check_rate_limit 패턴과 동일한 구조(원자적·cross-isolate).
CREATE OR REPLACE FUNCTION public.alert_counter_increment(
  p_key       text,
  p_window_ms bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count  integer;
  v_cutoff timestamptz := now() - (p_window_ms || ' milliseconds')::interval;
BEGIN
  INSERT INTO public.alert_counter_events (counter_key) VALUES (p_key);

  -- 기회적 정리: 이 키의 24시간 초과 행 제거(테이블 비대 방지)
  DELETE FROM public.alert_counter_events
   WHERE counter_key = p_key
     AND created_at < now() - interval '24 hours';

  SELECT count(*) INTO v_count
    FROM public.alert_counter_events
   WHERE counter_key = p_key
     AND created_at > v_cutoff;

  RETURN v_count;
END;
$$;

-- ── 3) 수동 리셋 RPC (운영자용 — resetAlertCounter 대응) ──
CREATE OR REPLACE FUNCTION public.alert_counter_reset(p_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.alert_counter_events WHERE counter_key = p_key;
$$;
