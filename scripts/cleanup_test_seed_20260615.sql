-- ⚠️ 데모용 테스트 시드 삭제 스크립트 (2026-06-15 삽입분)
-- 실제 중간보고 전 반드시 실행 — 테스트값이 성과지표(유치/상담/협진) 숫자에 섞이면 안 됨.
-- 마커: inquiries.intake->>'_test_seed' = 'khidi_demo_20260615' / referrals.reason LIKE '[TEST]%'
-- 순서 중요(FK): cost_estimates → consultation_sessions → referrals → inquiries

BEGIN;

DELETE FROM cost_estimates
WHERE consultation_id IN (
  SELECT id FROM consultation_sessions
  WHERE inquiry_id IN (SELECT id FROM inquiries WHERE intake->>'_test_seed' = 'khidi_demo_20260615')
);

DELETE FROM consultation_sessions
WHERE inquiry_id IN (SELECT id FROM inquiries WHERE intake->>'_test_seed' = 'khidi_demo_20260615');

DELETE FROM cotreatment_referrals WHERE reason LIKE '[TEST]%';

-- inquiries 삭제 시 case_status_history 는 FK CASCADE 로 함께 삭제됨
DELETE FROM inquiries WHERE intake->>'_test_seed' = 'khidi_demo_20260615';

-- 테스트 에이전시 + 담당자 연결 제거
DELETE FROM agency_users WHERE agency_id = (SELECT id FROM agencies WHERE code = 'TEST_AGENCY');
DELETE FROM agencies WHERE code = 'TEST_AGENCY';

COMMIT;

-- 검증: 모두 0 이어야 함
-- SELECT (SELECT count(*) FROM inquiries WHERE intake->>'_test_seed'='khidi_demo_20260615') AS inq,
--        (SELECT count(*) FROM cotreatment_referrals WHERE reason LIKE '[TEST]%') AS ref;
