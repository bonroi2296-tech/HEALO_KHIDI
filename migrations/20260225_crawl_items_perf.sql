-- 크롤 검토 페이지 성능 최적화 인덱스
-- 메인 조회 패턴: job_id + status + review_action IS NULL + ORDER BY name
CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_review_query
  ON crawl_raw_items (job_id, status, review_action, name)
  WHERE review_action IS NULL;

-- name 검색 (ILIKE) 지원
CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_name_trgm
  ON crawl_raw_items USING gin (name gin_trgm_ops);

-- 만약 pg_trgm 확장이 없으면 위 인덱스 대신 btree 사용
-- CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_name ON crawl_raw_items (job_id, name);
