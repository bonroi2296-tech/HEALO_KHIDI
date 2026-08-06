-- 우리 → 환자 방향의 서류함 (case_shared_documents)
--
-- 왜 새 표를 만드나: `inquiries.attachments` 는 **환자가 우리에게 낸** 자료다(코디가 대신
--   올린 것 포함). 반대 방향 — 소견서·사전상담 정리처럼 **우리가 환자에게 보내는** 서류를
--   같은 칸에 섞으면 「누가 낸 자료인가」가 흐려지고, 실수로 환자 서류가 환자에게 다시
--   노출될 수 있다. 방향이 다르면 칸도 다르게 둔다.
--
-- ⚠️ 노출 규칙(핵심): 이 표의 행은 **기본적으로 환자에게 안 보인다**(visible_to_patient=false).
--   코디가 문의 상세에서 「환자에게 보이기」를 켠 것만 공개 링크(/claim/<token>)에 뜬다.
--   공개 링크는 왓츠앱 등으로 굴러다닐 수 있어서, 「올리면 곧바로 나간다」로 두면 안 된다.
--   (app/api/inquiries/claim/route.ts 의 «서류는 의도적으로 안 내린다» 원칙을 이 스위치로만 연다.)
--
-- 파일 실물은 storage 버킷 `attachments` 에 `inquiry/<id>/shared/...` 로 둔다(기존 버킷 재사용).

CREATE TABLE IF NOT EXISTS case_shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id bigint NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime text,
  size_bytes bigint,
  note text,                                        -- 코디 메모(환자에게도 보인다)
  visible_to_patient boolean NOT NULL DEFAULT false,
  shared_at timestamptz,                            -- 「보이기」를 켠 시각(= 환자에게 나간 시점)
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_shared_documents_inquiry
  ON case_shared_documents(inquiry_id, created_at DESC);

ALTER TABLE case_shared_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_shared_documents_service ON case_shared_documents;
-- service_role 전용 — inquiries·case_opinions 와 동일. 브라우저 직접 접근 차단, 서버 API 경유.
CREATE POLICY case_shared_documents_service ON case_shared_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
