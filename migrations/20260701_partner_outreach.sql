-- 해외 파트너 아웃리치 추적 (코디·어드민 공용)
-- 목적: 아직 파트너가 아닌 해외 에이전시/병원을 "발굴 → 접촉 → 제휴"까지 추적.
--   (기존 agencies=이미 파트너, hospital_responses=환자별 병원접촉 과는 별개의 '영업 파이프라인')
-- 접근: service_role 전용 (API가 requirePortalAuth 로 코디·어드민 인증 후 supabaseAdmin 으로 처리)

CREATE TABLE IF NOT EXISTS partner_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기관 정보
  org_name       text NOT NULL,
  org_type       text CHECK (org_type IN ('agency','hospital','clinic','doctor','other')),
  contact_person text,
  contact_email  text,
  contact_phone  text,
  country        text,               -- 국가·도시 (예: '카자흐·알마티')

  -- 파이프라인 상태 (후보=아직 안 보냄 → 발송 → 답장 → 미팅 → 제휴 / 거절 / 보류)
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect','contacted','replied','meeting','partnership','rejected','on_hold')),
  priority int NOT NULL DEFAULT 0,    -- 1=최우선(★), 0=일반

  -- 타임라인
  first_contact_at   timestamptz,
  last_contact_at    timestamptz,
  next_followup_at   timestamptz,

  -- 메모
  notes  text,
  source text,                        -- 발굴 출처 (사이트·2GIS 등)

  -- 메타
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_name, country)
);

CREATE INDEX IF NOT EXISTS idx_partner_outreach_status   ON partner_outreach(status);
CREATE INDEX IF NOT EXISTS idx_partner_outreach_priority ON partner_outreach(priority DESC, updated_at DESC);

ALTER TABLE partner_outreach ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partner_outreach_service ON partner_outreach;
CREATE POLICY partner_outreach_service ON partner_outreach FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 실제 검색으로 찾은 시드 후보 (지어낸 것 없음 — 출처 표기, 미확인 이메일은 null)
INSERT INTO partner_outreach (org_name, org_type, contact_person, contact_email, contact_phone, country, status, priority, notes, source) VALUES
  ('MedicalTour (MT Agence)', 'agency', NULL, NULL, NULL, '카자흐', 'prospect', 1,
   '이미 한국·독일·프랑스·중국으로 암·심장 환자 송출(9년+). 사이트가 봇 차단 → 직접 열어 담당자·이메일 확인 필요. 최우선.', 'medical-tour.kz'),
  ('Wellness Travel', 'agency', NULL, 'contactus@wellnesstravel.kz', '+7 727 395-76-41', '알마티', 'prospect', 1,
   '이미 한국·일본·독일 등으로 환자 송출. 담당자 이름 확보 후 개인화 발송.', 'wellnesstravel.kz'),
  ('ALPHA-MED (AlphaMedGroup)', 'agency', 'Askar Yesekeyev (매니저 언급)', 'info@alpha-med.kz', '+7 771 708 2022 (WhatsApp)', '알마티', 'prospect', 0,
   '주로 국내 클리닉 + 해외연수 → 해외 환자 송출은 약할 수 있음. 확인 필요.', 'alpha-med.kz'),
  ('MedSolution', 'agency', NULL, NULL, NULL, '카자흐', 'prospect', 0,
   '의료관광 컨시어지. 사이트에서 연락처·송출국 확인.', 'medsolution.clinic'),
  ('Atyrau Planeta', 'agency', NULL, NULL, NULL, '아티라우', 'prospect', 0,
   '한국·중국·독일·태국·러시아 송출. 사이트에서 연락처 확인.', 'atyrauplaneta.kz'),
  ('UMIT 토모테라피 종양센터', 'hospital', NULL, NULL, NULL, '아스타나', 'prospect', 0,
   '주의: 인바운드(외국인 유치) 성격이라 경쟁일 수 있음. 자기 역량 밖 케이스 의뢰 각도로만 접근.', 'tomo.kz')
ON CONFLICT (org_name, country) DO NOTHING;
