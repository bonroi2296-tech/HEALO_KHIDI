-- ============================================
-- HEALO: 병원 종별(의료기관 종류) 칸 추가 — 유치수수료 법정 상한 판정용
-- 날짜: 2026-08-04
-- 실행: Supabase SQL Editor
-- ============================================
--
-- 왜 필요한가:
--   「의료 해외진출 및 외국인환자 유치 지원을 위한 통합고시」 제3조는 유치수수료 상한을
--   **의료기관 종별로 다르게** 정한다 — 상급종합 15% / 종합병원·병원(한방병원 포함) 20% / 의원 30%.
--   초과하면 법 제9조제1항 위반 → 제24조제1항제6호 **등록 취소 사유**다.
--   그런데 hospitals 표에 종별 칸이 아예 없어서 «상한을 기계가 판정할 수단»이 없었다.
--
--   PO 결정(2026-08-04): 수수료율은 **종별 상한을 꽉 채워** 받는다.
--   → 여유가 0이다. 반올림 하나, 항목 하나만 잘못 들어가도 즉시 위반이 된다.
--      그래서 사람 눈이 아니라 기계가 막아야 한다(견적 저장 시 검증).
--
-- 되돌리기: ALTER TABLE hospitals DROP COLUMN medical_institution_grade;
--   (가역적 «추가»라 자동 적용 대상. 데이터 삭제·파괴 아님.)

-- 1) 칸 추가 (기본값 NULL = 「아직 확인 안 됨」)
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS medical_institution_grade text;

-- 2) 허용 값 제한 — 오타로 상한 판정이 조용히 빗나가는 것을 막는다.
--    NULL 은 허용한다. NULL 의 뜻은 「모른다」이고, 코드가 그때 **가장 엄격한 상한(15%)**을 쓴다
--    (틀리는 방향이 «덜 받는다»이지 «법을 넘는다»가 아니게 — src/lib/legal/facilitationFeeCap.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hospitals_medical_institution_grade_chk'
  ) THEN
    ALTER TABLE hospitals
      ADD CONSTRAINT hospitals_medical_institution_grade_chk
      CHECK (
        medical_institution_grade IS NULL
        OR medical_institution_grade IN ('tertiary', 'general', 'hospital', 'clinic')
      );
  END IF;
END $$;

COMMENT ON COLUMN hospitals.medical_institution_grade IS
  '의료기관 종별 — 유치수수료 법정 상한 판정용. tertiary=상급종합(15%) / general=종합병원(20%) / hospital=병원·한방병원(20%) / clinic=의원(30%). 통합고시 제3조. NULL=미확인 → 코드가 가장 엄격한 15% 를 적용한다.';

-- 3) 확실한 것만 채운다 — **추측 금지**.
--    한방병원은 의료법 제3조제2항제3호상 「병원급 의료기관」이다. 우리 병원 수수료 계약 초안
--    (docs/marketing/hospital-commission-agreement-draft.md)도 「병원·종합병원(한방병원 포함) 20%
--    — 면력 한방병원」이라고 이미 적어 두었다.
UPDATE hospitals
   SET medical_institution_grade = 'hospital'
 WHERE name LIKE '면력한방병원%'
   AND medical_institution_grade IS NULL;

-- 4) 대학병원 4곳 — 보건복지부 «제5기 상급종합병원 지정기관 현황» 원문 대조 결과 (2026-08-04)
--    출처: 보도자료 첨부 PDF — https://www.mohw.go.kr/boardDownload.es?bid=0027&list_no=1479568&seq=2
--          (사본을 docs/reference/제5기_상급종합병원_지정명단_복지부.pdf 에 보관. 서울권 14곳 명단)
--    · 고려대학교의과대학부속«구로»병원   → 명단 있음 → tertiary (15%)
--    · 연세대학교의과대학«세브란스»병원   → 명단 있음 → tertiary (15%)
--    · 이화여자대학교의과대학부속«목동»병원 → 명단 있음 → tertiary (15%)
--    · 이대서울병원                      → **명단 없음** → 종합병원 general (20%)
--      (서울권 명단의 '…서울…병원'은 삼성서울·서울대·서울아산·서울성모 4곳뿐이고 이대서울은 없다)
--    ⚠️ **반드시 `IS NULL` 을 붙인 채로 둬라.** 이 파일을 다시 돌릴 일이 생기는데(새 환경 구축,
--       재적용, 마이그레이션 통합), 조건이 없으면 «나중에 사람이 올바르게 고쳐 놓은 값을 되돌린다».
--       특히 이대서울병원이 제6기에 상급종합으로 지정돼 15% 로 낮춰 놨는데 이 줄이 다시 돌면
--       **20% 로 올려버려서 기계가 위반을 허용하게 된다** — 아래 재검토 경고와 정면으로 어긋난다.
--       (2026-08-04 독립 리뷰 지적)
UPDATE hospitals SET medical_institution_grade = 'tertiary'
 WHERE name IN ('고려대학교 구로병원', '신촌세브란스병원', '이대목동병원')
   AND medical_institution_grade IS NULL;
UPDATE hospitals SET medical_institution_grade = 'general'
 WHERE name = '이대서울병원'
   AND medical_institution_grade IS NULL;

-- 병원 «이름»으로 맞추므로, 이름이 바뀌거나 새 지점이 생기면 조용히 빠진다(0행 갱신은 오류가 아니다).
-- 빠진 곳은 NULL 로 남아 코드가 15% 로 막으니 «법을 넘는» 사고는 안 나지만, 합법적인 20% 견적이
-- 막히는 것도 문제다 → 남은 미확인을 여기서 «눈에 띄게» 알린다.
DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing
    FROM hospitals
   WHERE is_partner = true AND medical_institution_grade IS NULL;
  IF missing > 0 THEN
    RAISE WARNING '[유치수수료 상한] 종별 미확인 협력병원 %건 — 전부 가장 엄격한 15%% 로 막힌다. 어드민 병원 편집에서 종별을 채워라.', missing;
  END IF;
END $$;

-- 🔴 **재검토: 2026-12-31** — 제5기 지정기간이 그날 끝난다(2024-01-01 ~ 2026-12-31).
--    제6기 명단이 나오면 위 4곳을 다시 대조하라. 지정에서 빠지면 상한이 15%→20% 로 «올라가고»,
--    새로 지정되면 20%→15% 로 «내려간다». 내려가는 쪽을 놓치면 그게 곧 위반이다.

-- 5) 확인용
SELECT name, medical_institution_grade
  FROM hospitals
 WHERE is_partner = true
 ORDER BY medical_institution_grade NULLS LAST, name;
