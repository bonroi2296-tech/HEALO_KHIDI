-- 2026-09-05 보안 감사 5라운드 조치 — 원격 DB 에는 이미 적용·검증 완료.
--
-- 왜: /api/partner/leads/[id] 와 /api/partner/treatments 가 병원이 보낸 금액을
--     `updates.quoted_price_min = body.quoted_price_min` 식으로 «검증 없이» 그대로 저장한다.
--     컬럼은 numeric 인데 CHECK 가 하나도 없어 음수·역전(min>max)이 아무 데서도 안 막혔다.
--     지금 이상 데이터가 0건인 건 방어가 있어서가 아니라 «견적이 아직 0건»이기 때문이다.
--     (참고: 2026-08-20 에 견적 기준가 63건이 전부 창작으로 밝혀진 전력이 있는 영역이다.)
--
-- 왜 코드가 아니라 DB 인가: 금액을 쓰는 경로가 여럿이라 한 곳만 고치면 다음 경로에서 또 샌다.
--     되돌릴 땐 DROP CONSTRAINT 한 줄.
-- NULL 은 통과(미입력=정상). 상한은 일부러 안 건다 — 의료비 상한을 우리가 정할 수 없다.

alter table public.hospital_leads
  drop constraint if exists hospital_leads_quoted_price_sane;

alter table public.hospital_leads
  add constraint hospital_leads_quoted_price_sane
  check (
    (quoted_price_min is null or quoted_price_min >= 0)
    and (quoted_price_max is null or quoted_price_max >= 0)
    and (quoted_price_min is null or quoted_price_max is null or quoted_price_min <= quoted_price_max)
  );

alter table public.treatments
  drop constraint if exists treatments_price_sane;

alter table public.treatments
  add constraint treatments_price_sane
  check (
    (price_min is null or price_min >= 0)
    and (price_max is null or price_max >= 0)
    and (price_min is null or price_max is null or price_min <= price_max)
  );

-- 되재는 법 (적용 확인)
--   select con.conname, con.convalidated, pg_get_constraintdef(con.oid)
--   from pg_constraint con join pg_class cl on cl.oid = con.conrelid
--   where con.conname in ('hospital_leads_quoted_price_sane','treatments_price_sane');
--   → 2026-09-05 실측: 둘 다 convalidated = true (강제 중)
