-- 전문의 소견 — 첨부 여러 건 지원 (검사지+진단서처럼 파일이 여러 개인 경우).
-- 기존 file_path/file_name(단일)은 과거 행 호환용으로 그대로 둔다. 새로 들어오는 다중 첨부는 files 배열에.
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS files jsonb;
