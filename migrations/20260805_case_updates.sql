-- 코디가 환자에게 남기는 «소식» — 한 건씩 쌓인다.
--
-- 왜 (2026-08-05 PO): *"지금 이대서울병원에 환자 관련 문의를 했거든. 그런거는 코디네이터가
--   코멘트를 남기게 해줬으면"*. 지금도 `inquiries.case_status_note` 가 환자 화면에 뜨지만
--   **한 칸이라 덮어쓴다** — 오늘 「이대서울병원에 문의했습니다」를 적고 모레 「회신 왔습니다」를
--   적으면 앞의 것이 사라진다. 환자 입장에서 «그동안 무슨 일이 있었나»가 안 남는다.
--   단계(case_status)를 옮길 일이 아닌 소식도 많다 — 문의·회신·서류 요청 같은 것.
--
-- 환자 화면에서는 단계 이력(case_status_history)과 **시간순으로 섞어서** 「지나온 기록」에 보인다.
--
-- ⚠️ 이 표에 적는 순간 환자가 읽는다(서류·소견처럼 「보이기」 스위치를 따로 두지 않는다).
--    칸 이름이 「환자에게 보이는 소식」이라 헷갈릴 여지가 없고, 잘못 적었으면 지우면 된다.
--    내부용 메모는 기존 「코디 메모」 칸을 쓴다 — 그건 환자에게 안 나간다.

CREATE TABLE IF NOT EXISTS case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id bigint NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_updates_inquiry ON case_updates(inquiry_id, created_at DESC);

ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_updates_service ON case_updates;
-- service_role 전용 — inquiries·case_opinions 와 동일. 브라우저 직접 접근 차단, 서버 API 경유.
CREATE POLICY case_updates_service ON case_updates FOR ALL TO service_role USING (true) WITH CHECK (true);
