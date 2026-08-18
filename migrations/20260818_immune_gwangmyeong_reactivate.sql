-- 2026-08-18: 면력 광명점을 다시 켜고, 4개 지점 의료진 수를 병원 공식 사이트 기준으로 맞춘다. (PO 결정)
--
-- 왜: 2026-06-24 에 시드 병원을 전부 is_active=false 로 껐다가(20260624_deactivate_seed_hospitals.sql)
--     7/06 에 손으로 되살릴 때 **광명점만 빠졌다**. 이 칸을 보는 곳이 코디·KHIDI 케이스 등록 병원
--     목록이라, 광명점 케이스를 그 화면에서 고를 수 없었다.
-- doctor_count: 성동만 8(실제 9)로 들어 있었고 나머지 3곳은 비어 있었다.
--     공식 사이트 실측(2026-08-18) = 강서 6 · 신촌 6 · 광명 7 · 성동 9.
-- 가역: 되돌리려면 광명점 행을 is_active=false 로 두면 된다.
-- (이미 prod 에 적용됨 — 이 파일은 재현/기록용. 멱등.)

UPDATE hospitals
SET is_active = true, updated_at = now()
WHERE slug = 'immunehospital-gwangmyeong';

UPDATE hospitals
SET doctor_count = v.cnt, updated_at = now()
FROM (VALUES
  ('immunehospital-magok', 6),
  ('immunehospital-sinchon', 6),
  ('immunehospital-gwangmyeong', 7),
  ('immunehospital-seongdong', 9)
) AS v(slug, cnt)
WHERE hospitals.slug = v.slug
  AND hospitals.doctor_count IS DISTINCT FROM v.cnt;
