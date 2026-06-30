-- AI 사용량·비용 계측 (제미나이 실시간 비용 추적의 토대)
--
-- 왜: 어드민 '외부 서비스 사용량' 화면이 제미나이 API 사용량/비용을 실시간으로
--     보여주려면, 각 AI 호출의 실제 토큰 수(usageMetadata)를 적재해야 한다.
--     기존 rate_limit_buckets 는 24h 슬라이딩 '호출 수'만 알 뿐 토큰·비용을 모른다.
--     → 호출마다 모델·토큰·추정비용을 append-only 로 기록한다(비용은 기록 시점에
--       동결 = 단가가 바뀌어도 과거 집계가 흔들리지 않음).
--
-- 멱등(재실행 안전): IF NOT EXISTS / CREATE INDEX IF NOT EXISTS 만 사용.
-- 보안: RLS enable + 정책 없음 = anon/authenticated 거부, service_role(supabaseAdmin) 전용.
--       PII 없음(쿼리 내용·환자정보 저장 금지 — 토큰 수·표면·모델만).

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id                bigserial   PRIMARY KEY,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- 호출 출처: public_chat | consult_translate | consult_stt | judge | embedding | other
  surface           text        NOT NULL,
  model             text        NOT NULL,
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  -- 기록 시점 단가로 계산해 동결(단가 변경이 과거 집계를 흔들지 않게)
  est_cost_usd      numeric(12,6),
  meta              jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created
  ON public.ai_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_surface_created
  ON public.ai_usage_events (surface, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
-- (정책 없음 = service_role 외 전면 거부)
