-- ============================================================
-- POSTMORTEMS #97 수리 (2차 발견) — 병원 오퍼 자동추출도 같은 부류로 죽어 있었다.
--
-- 발견 경로: 이번에 보강한 `scripts/check-schema-refs.mjs` 축 D(쓰기 경로 컬럼 대조)를
--   켜자마자 잡혔다. 코드가 4곳에서 `hospital_offer_jobs.updated_at` 을 update 하는데
--   실DB에 컬럼이 없어 전부 실패 → 테이블 0건(한 번도 작동 안 함).
--   자매 테이블 `hospital_offer_enrich_jobs` 에는 updated_at 이 있다 — 한쪽만 빠진 드리프트.
--
-- 참고: 같이 잡힌 `treatment_sources.raw_hash` 는 **컬럼을 만들지 않았다.**
--   어디서도 되읽지 않는 값이라 코드에서 제거하는 쪽이 맞다
--   (app/api/admin/hospitals/[id]/offers/apply/route.ts).
-- ============================================================

ALTER TABLE public.hospital_offer_jobs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
