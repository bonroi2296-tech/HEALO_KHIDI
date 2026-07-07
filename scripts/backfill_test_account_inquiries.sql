-- 실적 오염 백필 (1회성) — 접수 계정이 테스트 도메인인데 is_test=false 인 문의를 테스트로 도장.
--
-- 배경(2026-07-07): detectInquiryIsTest 가 '로그인 계정 이메일'을 안 봐서, 공유 @test.com 계정으로
--   로그인한 채 폼엔 개인 이메일(gmail 등)을 적어 접수하면 is_test=false 로 KHIDI 실적에 섞였다.
--   코드 수정(accountEmail 인자)은 신규 접수만 막으므로, 이미 들어온 오염분은 이 스크립트로 정정.
--
-- 되돌리기 쉬움: is_test 플래그만 바꾸며 데이터 파괴 없음(역쿼리로 원복 가능 — 맨 아래 주석).
-- 실행 위치: Supabase SQL Editor(service_role) — auth.users 조인 필요.
--
-- ⚠️ 의도적 예외: #37(키르기스 첫 실고객, 정식계정 이관 전까지 실적 유지 — PO 지시)은
--    기본 제외한다. PO 가 "전부 포함"으로 결정하면 아래 EXCEPT 절의 (37) 을 지운다.

-- 1) 먼저 대상 확인(반드시 먼저 SELECT 로 눈으로 확인 후 UPDATE):
SELECT i.id,
       u.email                     AS account_email,
       i.is_test,
       i.source,
       i.created_at
FROM inquiries i
JOIN auth.users u ON u.id = i.user_id
WHERE i.is_test = false
  AND split_part(lower(u.email), '@', 2) = 'test.com'   -- TEST_EMAIL_DOMAINS 와 동일 규칙(기본 test.com)
ORDER BY i.id;

-- 2) 확인 후 도장(예외 제외). #37 을 포함하려면 EXCEPT 서브쿼리에서 지운다.
UPDATE inquiries i
SET is_test = true
FROM auth.users u
WHERE u.id = i.user_id
  AND i.is_test = false
  AND split_part(lower(u.email), '@', 2) = 'test.com'
  AND i.id NOT IN (37);   -- 의도적 예외(키르기스 첫 실고객). PO '전부 포함' 결정 시 이 줄 삭제.

-- 원복(필요 시): 위에서 도장한 id 만 되돌린다. 예)
-- UPDATE inquiries SET is_test = false WHERE id IN (19, 22, 23);
