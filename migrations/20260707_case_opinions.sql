-- 세컨드 오피니언(전문의 소견) — 제3자 의사가 케이스에 비대면으로 소견을 남기는 흐름.
--   opinion_requests: 케이스당 공용 매직링크(토큰) 1건. 계정 불필요(화상상담 게스트링크 패턴).
--   case_opinions:    그 링크로 들어온 의사들의 소견(한 링크에 여러 명 가능).
--                     명단 4원장은 본인 선택으로 자동 귀속, '그 외 의료진'은 코디가 나중에 라벨(attribution_note).
-- ⚠️ hospital_leads(치료 유치 집계)와 분리한다 — 소견은 '자문'이지 '치료 유치'가 아니라서
--    syncLeadStatusToCase 의 KHIDI 유치 KPI 에 절대 안 걸리게 별도 저장소로 둔다.

CREATE TABLE IF NOT EXISTS opinion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id bigint NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid,
  note text,                       -- 코디가 의사에게 남기는 요청 메모(선택)
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES opinion_requests(id) ON DELETE SET NULL,
  inquiry_id bigint NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  doctor_key text,                 -- 명단 선택값(roster key) 또는 'other'
  doctor_name text NOT NULL,       -- 표시 이름(명단 라벨). '그 외 의료진'이면 placeholder → 코디가 라벨
  opinion_text text NOT NULL,
  attribution_note text,           -- 코디가 나중에 붙이는 귀속(그 외 의료진 신원 등)
  submitted_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opinion_requests_inquiry ON opinion_requests(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_opinion_requests_token ON opinion_requests(token);
CREATE INDEX IF NOT EXISTS idx_case_opinions_inquiry ON case_opinions(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_case_opinions_request ON case_opinions(request_id);

ALTER TABLE opinion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_opinions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opinion_requests_service ON opinion_requests;
DROP POLICY IF EXISTS case_opinions_service ON case_opinions;
-- service_role 전용 (inquiries·case_status_history 와 동일 정책 — 브라우저 직접 접근 차단, 서버 API 경유)
CREATE POLICY opinion_requests_service ON opinion_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY case_opinions_service ON case_opinions FOR ALL TO service_role USING (true) WITH CHECK (true);
