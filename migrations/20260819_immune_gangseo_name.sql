-- 2026-08-19: 면력 강서점 이름이 표에만 「마곡점」으로 남아 있던 것 정리.
--
-- 왜: 화면·데이터·병원 공식 사이트는 전부 「강서(점)」인데 hospitals 표만 「마곡점」이라,
--     코디·KHIDI 케이스 등록 화면의 병원 목록에서 「강서점」을 찾으면 안 나왔다.
--     주소값(slug=immunehospital-magok)은 그대로 둔다 — 바꾸면 옛 주소·사진 폴더가 깨진다.
-- 가역: 되돌리려면 name 을 '면력한방병원 마곡점' 으로 두면 된다.
-- (이미 prod 에 적용됨 — 이 파일은 재현/기록용. 멱등.)

UPDATE hospitals
SET name = '면력한방병원 강서점', updated_at = now()
WHERE slug = 'immunehospital-magok'
  AND name IS DISTINCT FROM '면력한방병원 강서점';
