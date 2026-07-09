-- 케이스 진행단계 9단계 → 6단계(+보류) 압축.
-- 배경: "병원 치료가능 검토 중" 한 단계 안에 원장님 비공식 자문과 공식 병원 배정·회신이
-- 뒤섞여 코디/에이전시가 같은 단어를 다르게 읽던 문제. 케이스별 디테일은 자유 체크리스트
-- (case_substeps)로 흡수. 신 6단계: intake·consultation·preparation·treatment·follow_up·completed.
-- (이 파일은 이미 운영 DB에 직접 적용된 변경을 기록·재현하기 위한 소급 마이그레이션 —
--  전부 IF NOT EXISTS/DROP IF EXISTS 가드로 재실행해도 안전.)

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS case_substeps jsonb;

-- 구단계 데이터를 신단계로 백필(구단계 정보는 case_status_note 에 힌트로 보존, 원문은
-- case_status_history 에 그대로 남아 caseStatus.ts 의 OLD_KEY_ALIASES 로 계속 조회 가능).
UPDATE inquiries SET case_status = 'intake'        WHERE case_status = 'received';
UPDATE inquiries SET case_status = 'consultation'  WHERE case_status IN ('pre_consult', 'hospital_review');
UPDATE inquiries SET case_status = 'preparation'   WHERE case_status IN ('scheduling', 'visa_prep');

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_case_status_chk;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_case_status_chk
  CHECK (case_status IS NULL OR case_status IN
    ('intake', 'consultation', 'preparation', 'treatment', 'follow_up', 'completed', 'on_hold'));
