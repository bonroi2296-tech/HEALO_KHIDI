-- hospitals 테이블에 전화번호, 웹사이트 컬럼 추가
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website TEXT;
