-- 20260702_consultation_sessions_is_test.sql
-- K-02 오염 벡터 차단 — consultation_sessions 자체 테스트 표식 (KNOWN_ISSUES K-02).
--
-- 왜: 테스트/실제 분리의 단일 표식은 inquiries.is_test 인데(20260630), 상담세션은
--     inquiry_id 로 따라가 제외한다. 그러나 **inquiry 에 연결되지 않은 세션**은
--     따라갈 고리가 없어 테스트여도 원천적으로 제외 불가 — 실제로 PO 테스트
--     완료세션(notes '[TEST]')이 K-02 실적으로 집계됐다.
--     → 세션에도 보조 표식 is_test 를 두고, 집계 제외는 "inquiry 체인 ∪ 세션 표식"
--     합집합으로(체인은 유지 — 문의가 나중에 테스트로 도장돼도 계속 걸러지게).
--
-- 가역성: 컬럼·인덱스 '추가' + boolean 플래그 UPDATE 뿐. 데이터 파괴 없음 → 자동적용 가능.
-- 재실행 안전(idempotent): IF NOT EXISTS + 조건부 UPDATE.

-- ── 1) 표식 컬럼 ───────────────────────────────────────────────
ALTER TABLE consultation_sessions
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN consultation_sessions.is_test IS
  '테스트/데모 세션 표식(보조). 생성 시점에 연결 inquiry.is_test 상속 + notes [TEST] 마커 + 명시 지정으로 도장. KPI(K-02/K-04) 집계는 이 표식 ∪ inquiry 체인 합집합으로 제외.';

-- ── 2) 백필 ────────────────────────────────────────────────────
-- 2a) 테스트 문의에 딸린 세션 (기존 체인과 동일 기준을 컬럼에도 반영)
UPDATE consultation_sessions s SET is_test = true
WHERE s.is_test = false
  AND s.inquiry_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM inquiries i WHERE i.id = s.inquiry_id AND i.is_test = true);

-- 2b) inquiry 미연결이지만 notes 에 [TEST] 마커가 있는 세션 (K-02 오염 실사례 2건 부류)
UPDATE consultation_sessions SET is_test = true
WHERE is_test = false AND notes ILIKE '%[TEST]%';

-- ── 3) '실적만' 집계 가속용 부분 인덱스 ────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_real_scheduled_at
  ON consultation_sessions(scheduled_at) WHERE is_test = false;
