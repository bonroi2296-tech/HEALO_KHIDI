-- ============================================================
-- P0-mini: crawl_raw_items 유니크 제약 + crawl_jobs 복합 인덱스
-- ============================================================
--
-- 사전 조건: 아래 중복 탐지 쿼리를 먼저 실행하여 중복 행이 없는지 확인할 것
--
--   SELECT job_id, source_unique_id, count(*)
--   FROM crawl_raw_items
--   GROUP BY job_id, source_unique_id
--   HAVING count(*) > 1;
--
-- 중복 행이 있으면 이 마이그레이션은 실패합니다.
-- 중복 행을 먼저 정리(삭제/병합)한 뒤 실행하세요.
-- ============================================================

-- (A) 동일 크롤 작업 내 같은 소스 아이템 중복 적재 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_raw_items_job_source_uid
  ON public.crawl_raw_items (job_id, source_unique_id);

-- (B) 크롤 작업 목록 조회 최적화 (status 필터 + created_at 정렬)
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_created
  ON public.crawl_jobs (status, created_at DESC);
