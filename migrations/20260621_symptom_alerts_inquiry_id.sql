-- ============================================================
-- 침묵환자 감지(silence_long)를 inquiry_id 기준으로 동작시키기 위한 스키마 확장
-- ============================================================
-- 배경(POSTMORTEMS #12/#13 후속):
--  - 실제 환자 연결고리는 inquiry_id(메신저 문의 환자는 auth 계정 uuid 가 없음).
--  - consultation_sessions.patient_id 는 전 행 null(미사용)이라 detect-silent cron 이
--    항상 0건 → 침묵(장기 미응답) 알림이 한 번도 안 떴음.
--  - symptom_alerts.patient_id(uuid, NOT NULL, → auth.users)만으로는 계정 없는
--    문의 환자에 대한 알림을 저장조차 못 함.
--  → inquiry_id 컬럼을 추가하고 patient_id 를 nullable 로 풀어 두 경로를 모두 지원.
--    (증상 보고 제출 경로 = 로그인 환자 patient_id / silence cron = inquiry_id)
--
-- ⚠️ 멱등성(재실행 안전): IF NOT EXISTS / DROP CONSTRAINT IF EXISTS 사용 (POSTMORTEMS #6).

ALTER TABLE symptom_alerts
  ADD COLUMN IF NOT EXISTS inquiry_id BIGINT REFERENCES inquiries(id) ON DELETE CASCADE;

-- inquiry 기반 알림은 auth 계정이 없으므로 patient_id 를 nullable 로
ALTER TABLE symptom_alerts ALTER COLUMN patient_id DROP NOT NULL;

-- 최소 하나의 식별자(patient_id 또는 inquiry_id)는 반드시 있어야 함
ALTER TABLE symptom_alerts DROP CONSTRAINT IF EXISTS symptom_alerts_has_subject;
ALTER TABLE symptom_alerts ADD CONSTRAINT symptom_alerts_has_subject
  CHECK (patient_id IS NOT NULL OR inquiry_id IS NOT NULL);

-- inquiry 기준 미해결 알림 조회 / 중복 방지용 인덱스
CREATE INDEX IF NOT EXISTS idx_symptom_alerts_inquiry_active
  ON symptom_alerts(inquiry_id, detected_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON COLUMN symptom_alerts.inquiry_id IS
  '메신저 문의 환자(auth 계정 없음) 식별 — silence_long cron 등 inquiry 기준 알림용. patient_id 와 둘 중 하나 필수.';
