/**
 * WebRTC Telemedicine Consultation System
 *
 * Purpose:
 * - Enable remote consultations between Korean hospitals and Kazakhstan patients
 * - Support multiple consultation types (pre_consultation, follow_up, emergency)
 * - Track participants (patient, doctor, coordinator, translator)
 * - Integration with LiveKit (or mock/fallback for now)
 */

-- ========================================
-- 1. consultation_sessions table
-- ========================================

CREATE TABLE IF NOT EXISTS consultation_sessions (
  id BIGSERIAL PRIMARY KEY,

  -- Core consultation info
  patient_id BIGINT REFERENCES cancer_patient_intakes(id) ON DELETE CASCADE,
  doctor_id TEXT, -- User ID or email of doctor
  coordinator_id TEXT, -- HEALO agent/coordinator
  translator_id TEXT, -- Optional translator

  -- Session metadata
  session_type TEXT NOT NULL CHECK (session_type IN (
    'pre_consultation',   -- Initial assessment before treatment
    'follow_up',          -- Post-treatment follow-up
    'emergency',          -- Urgent medical issue
    'diagnostic'          -- Review of test results
  )),

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Location/Language
  patient_language TEXT DEFAULT 'ru' CHECK (patient_language IN ('ru', 'kz', 'en')),
  doctor_language TEXT DEFAULT 'ko' CHECK (doctor_language IN ('ko', 'en')),

  -- Session status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',      -- Upcoming
    'active',         -- In progress
    'completed',      -- Finished
    'cancelled',      -- Cancelled
    'no_show'         -- Patient didn't show up
  )),

  -- Room info for LiveKit (or mock)
  livekit_room_name TEXT UNIQUE, -- Generated UUID-based room name
  livekit_token_patient TEXT,
  livekit_token_doctor TEXT,
  livekit_token_coordinator TEXT,
  livekit_token_translator TEXT,

  -- Notes
  notes TEXT,
  clinical_summary TEXT, -- Doctor's notes after consultation
  recommendations TEXT,  -- Recommended next steps

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_patient
ON consultation_sessions(patient_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_doctor
ON consultation_sessions(doctor_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_coordinator
ON consultation_sessions(coordinator_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_status
ON consultation_sessions(status, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_livekit_room
ON consultation_sessions(livekit_room_name);

-- ========================================
-- 2. consultation_translations table
-- Real-time translation logs
-- ========================================

CREATE TABLE IF NOT EXISTS consultation_translations (
  id BIGSERIAL PRIMARY KEY,

  consultation_id BIGINT NOT NULL REFERENCES consultation_sessions(id) ON DELETE CASCADE,

  -- Translation direction
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,

  -- Content
  original_text TEXT NOT NULL,
  translated_text TEXT,

  -- Metadata
  speaker_role TEXT CHECK (speaker_role IN ('patient', 'doctor', 'coordinator')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  translation_confidence NUMERIC(3,2) -- 0.00 to 1.00
);

CREATE INDEX IF NOT EXISTS idx_consultation_translations_session
ON consultation_translations(consultation_id);

-- ========================================
-- 3. consultation_messages table
-- Text chat during consultation
-- ========================================

CREATE TABLE IF NOT EXISTS consultation_messages (
  id BIGSERIAL PRIMARY KEY,

  consultation_id BIGINT NOT NULL REFERENCES consultation_sessions(id) ON DELETE CASCADE,

  -- Sender info
  sender_id TEXT NOT NULL,
  sender_role TEXT CHECK (sender_role IN ('patient', 'doctor', 'coordinator', 'translator')),
  sender_name TEXT,

  -- Message
  message_text TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_session
ON consultation_messages(consultation_id, created_at ASC);

-- ========================================
-- 4. Update trigger for updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_consultation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_consultation_sessions_updated_at ON consultation_sessions;
CREATE TRIGGER trigger_consultation_sessions_updated_at
BEFORE UPDATE ON consultation_sessions
FOR EACH ROW
EXECUTE FUNCTION update_consultation_sessions_updated_at();

-- ========================================
-- 5. Views
-- ========================================

-- Upcoming consultations
CREATE OR REPLACE VIEW v_upcoming_consultations AS
SELECT
  cs.id,
  cs.patient_id,
  cs.scheduled_at,
  cs.session_type,
  cs.patient_language,
  cs.doctor_language,
  cpi.cancer_type,
  cpi.cancer_stage,
  COALESCE(cpi.first_name, 'Patient') as patient_name,
  cs.doctor_id,
  cs.coordinator_id,
  EXTRACT(EPOCH FROM (cs.scheduled_at - NOW())) / 3600 as hours_until_session
FROM consultation_sessions cs
LEFT JOIN cancer_patient_intakes cpi ON cpi.id = cs.patient_id
WHERE cs.status = 'scheduled'
  AND cs.scheduled_at > NOW()
ORDER BY cs.scheduled_at ASC;

COMMENT ON VIEW v_upcoming_consultations IS 'Upcoming scheduled consultations';

-- Today's consultations
CREATE OR REPLACE VIEW v_todays_consultations AS
SELECT
  cs.id,
  cs.patient_id,
  cs.status,
  cs.session_type,
  cs.scheduled_at,
  cpi.cancer_type,
  cpi.cancer_stage,
  cs.doctor_id,
  cs.coordinator_id
FROM consultation_sessions cs
LEFT JOIN cancer_patient_intakes cpi ON cpi.id = cs.patient_id
WHERE DATE(cs.scheduled_at) = CURRENT_DATE
ORDER BY cs.scheduled_at ASC;

COMMENT ON VIEW v_todays_consultations IS 'All consultations scheduled for today';

-- ========================================
-- 6. Table comments
-- ========================================

COMMENT ON TABLE consultation_sessions IS 'WebRTC telemedicine consultation sessions';
COMMENT ON COLUMN consultation_sessions.patient_id IS 'Reference to cancer_patient_intakes';
COMMENT ON COLUMN consultation_sessions.session_type IS 'Type of consultation (pre-treatment, follow-up, emergency, diagnostic)';
COMMENT ON COLUMN consultation_sessions.livekit_room_name IS 'Unique room identifier for LiveKit (UUID-based)';
COMMENT ON COLUMN consultation_sessions.livekit_token_patient IS 'JWT token for patient to join room';
COMMENT ON COLUMN consultation_sessions.livekit_token_doctor IS 'JWT token for doctor to join room';
COMMENT ON TABLE consultation_translations IS 'Real-time translation logs during consultation';
COMMENT ON TABLE consultation_messages IS 'Text chat messages during consultation';
