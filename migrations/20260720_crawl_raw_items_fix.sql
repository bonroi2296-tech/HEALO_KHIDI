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
--   · source_id    → ⚠️ **처음엔 "아무도 안 읽는다"고 판단해 코드에서 제거했다가 되돌렸다**
--                    (독립 리뷰 지적, 2026-07-20). 실제로는 job-review.ts:113,142 가
--                    `item.source_id` 를 읽어 `hospitals.data_source` 에 넣고, job-runner 가
--                    그 값으로 기존 병원·폐업을 조회한다(.eq("data_source", sourceId)).
--                    없으면 data_source 가 NULL 로 들어가 다음 크롤에서 같은 병원이 "신규"로
--                    중복 생성되고 폐업 감지에서도 빠진다. **컬럼을 만든다.**
--                    ※ 오판 원인: grep 결과를 `head` 로 자른 채 "없다"고 결론냈다.
--                      잘린 검색 결과는 "결과 없음"이 아니다.
-- ============================================================

ALTER TABLE public.crawl_raw_items
  ADD COLUMN IF NOT EXISTS hospital_id uuid NULL REFERENCES public.hospitals(id) ON DELETE SET NULL;

ALTER TABLE public.crawl_raw_items
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL;

ALTER TABLE public.crawl_raw_items
  ADD COLUMN IF NOT EXISTS source_id text NULL;

CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_source
  ON public.crawl_raw_items (source_id);

CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_hospital
  ON public.crawl_raw_items (hospital_id);
CREATE INDEX IF NOT EXISTS idx_crawl_raw_items_job_status
  ON public.crawl_raw_items (job_id, status);
