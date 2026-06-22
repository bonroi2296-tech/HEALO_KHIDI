-- 2026-06-22 — cancer_patient_intakes.inquiry_id UNIQUE 인덱스
--
-- 왜: /api/inquiries/step2 가 cancer_patient_intakes 를 upsert(onConflict:"inquiry_id")
--     하는데 inquiry_id 에 UNIQUE 제약/인덱스가 없어 Postgres 가 항상 거부 → 무음 실패.
--     (보조 리포팅 테이블이라 비치명적이었으나 — 정본 데이터는 inquiries.intake 암호화본 —
--      퍼널 인테이크가 이 테이블엔 한 번도 안 쌓였음.) UNIQUE 추가로 upsert 정상화.
-- 안전: NULL 은 Postgres 에서 distinct → 기존 레거시(inquiry_id NULL) 행과 충돌 없음.
--       적용 시점 중복 inquiry_id 행 0개 확인함. 가역적(인덱스 drop).
-- 멱등 가드 포함(scripts/check-migration-idempotency.mjs).

create unique index if not exists cancer_patient_intakes_inquiry_id_key
  on public.cancer_patient_intakes (inquiry_id);
