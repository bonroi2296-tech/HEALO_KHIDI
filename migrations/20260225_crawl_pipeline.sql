-- ============================================================
-- 크롤 파이프라인 스키마: crawl_jobs, crawl_raw_items + hospitals 확장
-- ============================================================

-- 1) crawl_jobs: 크롤 실행 이력 및 진행 상태 추적
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','completed','failed')),
  params        JSONB NOT NULL DEFAULT '{}',
  progress_current INT NOT NULL DEFAULT 0,
  progress_total   INT NOT NULL DEFAULT 0,
  stats         JSONB NOT NULL DEFAULT '{"new":0,"changed":0,"unchanged":0,"closed":0,"errors":0}',
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawl_jobs_status ON crawl_jobs (status);
CREATE INDEX idx_crawl_jobs_created ON crawl_jobs (created_at DESC);

-- 2) crawl_raw_items: 수집된 로우 데이터 스테이징
CREATE TABLE IF NOT EXISTS crawl_raw_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  source_id        TEXT NOT NULL,
  source_unique_id TEXT NOT NULL,
  name             TEXT NOT NULL,
  data             JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','existing','changed','unchanged','closed')),
  hospital_id      UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  change_diff      JSONB,
  review_action    TEXT CHECK (review_action IN ('approved','rejected','skipped')),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawl_raw_items_job ON crawl_raw_items (job_id);
CREATE INDEX idx_crawl_raw_items_source ON crawl_raw_items (source_id, source_unique_id);
CREATE INDEX idx_crawl_raw_items_status ON crawl_raw_items (status, review_action);
CREATE INDEX idx_crawl_raw_items_hospital ON crawl_raw_items (hospital_id) WHERE hospital_id IS NOT NULL;

-- 3) hospitals 테이블 확장 컬럼
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS data_source       TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS source_unique_id  TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS last_crawled_at   TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitals_source_uid
  ON hospitals (data_source, source_unique_id)
  WHERE data_source IS NOT NULL AND source_unique_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospitals_active ON hospitals (is_active);
