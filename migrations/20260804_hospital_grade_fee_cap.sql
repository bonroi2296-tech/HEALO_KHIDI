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

-- ⚠️ 대학병원 4곳(고려대 구로·신촌세브란스·이대목동·이대서울)은 **일부러 비워 둔다.**
--    상급종합병원 지정은 보건복지부가 3년마다 고시하는 것이고(제5기 2024~2026),
--    이 세션에서 공식 명단을 끝까지 확인하지 못했다(HIRA 조회 키 없음 · 명단 페이지 접근 실패).
--    추측해서 넣으면 «상한을 잘못 적용»하게 되고 그게 곧 등록취소 사유다.
--    비워 두면 코드가 15% 로 막으므로 «법을 넘는 방향»으로는 절대 안 틀린다.
--    채우는 방법: ①HIRA_API_KEY 를 넣고 getHospBasisList 의 clCdNm 조회
--               ②각 병원 요양기관 정보 또는 유치의료기관 등록증 확인

-- 4) 확인용
SELECT name, medical_institution_grade
  FROM hospitals
 WHERE is_partner = true
 ORDER BY medical_institution_grade NULLS LAST, name;
