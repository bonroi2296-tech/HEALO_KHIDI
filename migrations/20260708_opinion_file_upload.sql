-- 전문의 소견 — 원장님이 텍스트 대신 파일(문서·이미지)로 준 소견을 그대로 첨부.
-- 업로드되면 서버가 translateMedicalDoc(ko)으로 자동 번역해 opinion_text 초안을 채운다
-- (코디가 검수 후 "에이전시에 공개"하는 기존 흐름은 그대로 — AI 번역은 초안일 뿐).
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE case_opinions ADD COLUMN IF NOT EXISTS file_name text;
