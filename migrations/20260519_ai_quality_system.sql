-- AI 응답 품질 자동 관리 시스템 — 2026-05-19
-- chat_feedback / ai_response_evaluations / ai_regression_tests / ai_regression_runs

CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  reason_category TEXT,
  comment TEXT,
  guest_email TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_thread ON chat_feedback(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_message ON chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_rating ON chat_feedback(rating, created_at DESC);
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ai_response_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  query_text TEXT,
  response_text TEXT,
  hallucination_score NUMERIC(3,2),
  safety_score NUMERIC(3,2),
  relevance_score NUMERIC(3,2),
  overall_score NUMERIC(3,2),
  flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  judge_model TEXT,
  judge_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_eval_overall_score ON ai_response_evaluations(overall_score) WHERE overall_score < 0.6;
CREATE INDEX IF NOT EXISTS idx_ai_eval_message ON ai_response_evaluations(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_eval_flags ON ai_response_evaluations USING GIN(flags);
ALTER TABLE ai_response_evaluations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ai_regression_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id TEXT NOT NULL,
  scenario_category TEXT,
  query_text TEXT NOT NULL,
  expected_behavior TEXT,
  language TEXT DEFAULT 'ko',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scenario_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_regression_active ON ai_regression_tests(is_active, scenario_category);
ALTER TABLE ai_regression_tests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ai_regression_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ai_regression_tests(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  response_text TEXT,
  overall_score NUMERIC(3,2),
  flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  passed BOOLEAN,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_regression_runs_date ON ai_regression_runs(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_regression_runs_test ON ai_regression_runs(test_id, run_date DESC);
ALTER TABLE ai_regression_runs ENABLE ROW LEVEL SECURITY;
