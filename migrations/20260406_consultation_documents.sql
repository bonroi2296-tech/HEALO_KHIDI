/**
 * consultation_documents — 환자 의료 문서 업로드 메타데이터
 * Storage: Supabase Storage 'documents' bucket
 */

CREATE TABLE IF NOT EXISTS consultation_documents (
  id BIGSERIAL PRIMARY KEY,
  consultation_id BIGINT NOT NULL REFERENCES consultation_sessions(id),

  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,            -- MIME type
  file_size BIGINT NOT NULL,          -- bytes
  storage_path TEXT NOT NULL,         -- Supabase Storage path
  document_type TEXT DEFAULT 'other', -- 'medical_record', 'test_result', 'imaging', 'prescription', 'other'
  description TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_documents_session
ON consultation_documents(consultation_id);

-- Storage bucket (run manually if needed):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

COMMENT ON TABLE consultation_documents IS 'Metadata for patient-uploaded medical documents stored in Supabase Storage';
