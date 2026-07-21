-- 전문의 소견 — 접수되는 시점에 환자 언어로 자동 번역해 코디 확정본 초안에 미리 채워둔다.
-- (코디가 버튼을 눌러야만 번역되던 것을 "데이터 들어올 때 바로" 로 변경 — 버튼은 재번역용 폴백으로 유지.)
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS auto_translated_text text;
