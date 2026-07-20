-- ============================================================
-- POSTMORTEMS #97 수리 — 병원 크롤 검수(/admin/crawl) 되살리기
--
-- 배경: `crawl_raw_items` 에 코드가 쓰는 컬럼 4개가 실DB에 없어 insert/update 가 항상
--   실패했다 → crawl_raw_items 0건·crawl_jobs 0건(한 번도 작동 안 함).
--   2026-07-15 완성도 감사에서 조회 쪽만 `name:title` alias 로 우회됐고 쓰기 경로는
--   그대로 남아 있었다(반쪽 수정, #18 부류).
--
-- 컬럼별 판단 (없는 걸 다 만들지 않는다 — 필요한 것만):
--   · hospital_id  → 실제로 읽힘(job-review.ts 가 변경/폐업 항목을 기존 병원에 반영할 때
--                    `item.hospital_id` 로 대상 지정). **추가한다.**
--   · reviewed_at  → 승인/거절/건너뛰기 update 3곳이 씀. **추가한다.**
--   · name         → 이미 동일 의미의 `title` 컬럼이 있다. 중복 컬럼을 만들지 않고
--                    **코드를 title 로 고친다**(이 마이그레이션에선 아무것도 안 함).
--   · source_id    → crawl_raw_items 에서 되읽는 곳이 전혀 없다(전부 crawl_jobs 대상).
--                    job_id → crawl_jobs.source_id 로 유도 가능. **코드에서 제거**(컬럼 안 만듦).
-- ============================================================

ALTER TABLE public.crawl_raw_items
  ADD COLUMN IF NOT EXISTS hospital_id uuid NULL REFERENCES public.hospitals(id) ON DELETE SET NULL;

ALTER TABLE public.crawl_raw_items
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_hospital
  ON public.crawl_raw_items (hospital_id);
CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_job_status
  ON public.crawl_raw_items (job_id, status);
