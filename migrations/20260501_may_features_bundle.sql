-- 2026-05 신규 기능 통합 마이그레이션
-- 1. 환자 만족도 설문 (surveys, survey_responses)
-- 2. 예약 자동 리마인더 (reminders_scheduled)
-- 3. 실시간 In-app 알림 (notifications)
-- 4. 사후 관리 이상치 감지 (symptom_alerts)
-- 5. KHIDI KPI 스냅샷 (kpi_snapshots) — 일별 집계 캐시
--
-- 안전: 모든 테이블 RLS 활성화 + service_role 만 접근.
-- 클라이언트 직접 접근 금지 (서버 API 경유).

-- ============================================================
-- 1. 환자 만족도 설문
-- ============================================================
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id),
  survey_type TEXT NOT NULL DEFAULT 'post_consultation',
  token TEXT UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surveys_token ON surveys(token);
CREATE INDEX IF NOT EXISTS idx_surveys_session ON surveys(consultation_session_id);
CREATE INDEX IF NOT EXISTS idx_surveys_responded ON surveys(responded) WHERE responded = FALSE;

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  q1_score INT CHECK (q1_score BETWEEN 1 AND 5),
  q2_score INT CHECK (q2_score BETWEEN 1 AND 5),
  q3_score INT CHECK (q3_score BETWEEN 1 AND 5),
  q4_score INT CHECK (q4_score BETWEEN 1 AND 5),
  q5_score INT CHECK (q5_score BETWEEN 1 AND 5),
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses(submitted_at);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. 자동 리마인더 (외부 스케줄러 또는 cron 으로 발송)
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders_scheduled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_session_id UUID REFERENCES consultation_sessions(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '30min_before' | 'survey_request' | 'followup_30d' | etc
  fire_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL, -- 'email' | 'kakao' | 'sms' | 'in_app'
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_address TEXT, -- email 주소 또는 phone (게스트 환자용)
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'cancelled'
  attempts INT DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending_fire
  ON reminders_scheduled(fire_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_session ON reminders_scheduled(consultation_session_id);

ALTER TABLE reminders_scheduled ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. 실시간 In-app 알림
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'consultation_reminder' | 'new_message' | 'symptom_alert' | 'admin_notice' | etc
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- 클릭 시 이동 URL
  payload JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회·읽음 처리 가능
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 4. 사후 관리 이상치 감지 알림
-- ============================================================
CREATE TABLE IF NOT EXISTS symptom_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_entry_id UUID, -- 원본 증상 입력 참조 (테이블 있으면)
  alert_type TEXT NOT NULL, -- 'fever_high' | 'pain_critical' | 'symptom_recurrence' | 'silence_long'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  detected_at TIMESTAMPTZ DEFAULT now(),
  detected_by TEXT DEFAULT 'ai', -- 'ai' | 'rule' | 'coordinator'
  data JSONB DEFAULT '{}'::jsonb, -- 감지 근거 (수치·메시지 등)
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_symptom_alerts_patient_active
  ON symptom_alerts(patient_id, detected_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_symptom_alerts_severity
  ON symptom_alerts(severity, detected_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE symptom_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. KHIDI KPI 일별 스냅샷 (대시보드 캐시)
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  snapshot_date DATE PRIMARY KEY,
  pre_consultation_count INT DEFAULT 0,
  follow_up_count INT DEFAULT 0,
  patient_attraction_count INT DEFAULT 0,
  satisfaction_avg NUMERIC(5,2),
  satisfaction_response_count INT DEFAULT 0,
  unique_patients_count INT DEFAULT 0,
  countries JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date_desc ON kpi_snapshots(snapshot_date DESC);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS — service_role 전용 (기본). admin 도 별도 정책 추가 가능.
-- ============================================================
-- notifications 만 본인 정책 위에 추가.
-- 나머지 테이블은 server-only 모듈에서 service_role 키로만 접근.

COMMENT ON TABLE surveys IS '환자 만족도 설문 발송 토큰 — K-03 측정용';
COMMENT ON TABLE survey_responses IS '5문항 응답 점수 (1~5) → 100점 환산';
COMMENT ON TABLE reminders_scheduled IS '외부 스케줄러가 fire_at 도래 시 발송';
COMMENT ON TABLE notifications IS '실시간 In-app 알림 (Supabase Realtime 구독 대상)';
COMMENT ON TABLE symptom_alerts IS '사후 관리 이상치 자동 감지 알림';
COMMENT ON TABLE kpi_snapshots IS 'KHIDI 일별 KPI 캐시 — 대시보드·월간보고 자동 생성용';
