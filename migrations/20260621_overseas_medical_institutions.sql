-- HEALO/KHIDI: 해외 의료기관(현지 병원) 계정 계층 추가
-- ============================================================
-- 배경: 환자를 한국으로 의뢰하는 "해외 의료기관"은 "해외 에이전시"와
--      기능이 동일(환자 의뢰 + 진행상황 추적)하므로 별도 테이블/포털을
--      새로 만들지 않고 기존 agencies/agency_users/(포털 /agency) 인프라를
--      재활용한다. 구분은 agencies.partner_type 한 컬럼으로만.
--
-- 안전성: 기존 행은 default 'agency' 로 채워져 동작 변화 없음(additive).
--        되돌리려면 컬럼만 DROP 하면 됨.

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS partner_type text NOT NULL DEFAULT 'agency';

-- 허용값 제약: agency(유치 에이전시) | medical_institution(해외 의료기관)
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_partner_type_chk;
ALTER TABLE agencies ADD CONSTRAINT agencies_partner_type_chk
  CHECK (partner_type IN ('agency', 'medical_institution'));

COMMENT ON COLUMN agencies.partner_type IS
  'agency: 해외 유치 에이전시 / medical_institution: 환자를 의뢰하는 해외 현지 병원. 계정 계층 표준은 src/lib/auth/accountTiers.ts';

CREATE INDEX IF NOT EXISTS idx_agencies_partner_type ON agencies(partner_type);
