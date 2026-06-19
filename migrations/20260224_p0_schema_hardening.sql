-- ============================================================
-- P0 Schema Hardening: 유니크 제약, 기본값 제거, 인덱스
-- ============================================================

-- 1. rag_chunks: 동일 문서 내 중복 chunk_index 방지
ALTER TABLE public.rag_chunks DROP CONSTRAINT IF EXISTS rag_chunks_document_chunk_unique;
ALTER TABLE public.rag_chunks
  ADD CONSTRAINT rag_chunks_document_chunk_unique
  UNIQUE (document_id, chunk_index);

-- 2. rag_documents: 동일 소스 중복 문서 방지
ALTER TABLE public.rag_documents DROP CONSTRAINT IF EXISTS rag_documents_source_unique;
ALTER TABLE public.rag_documents
  ADD CONSTRAINT rag_documents_source_unique
  UNIQUE (source_type, source_id, lang, version);

-- 3. admin_notification_logs: 중복 알림 발송 방지
ALTER TABLE public.admin_notification_logs
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_logs_dedupe
  ON public.admin_notification_logs (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. rating 기본값 제거 (가짜 평점 방지)
ALTER TABLE public.hospitals ALTER COLUMN rating SET DEFAULT NULL;
ALTER TABLE public.treatments ALTER COLUMN rating SET DEFAULT NULL;

-- 기존 기본값(4.8/4.9)을 가진 병원/시술 중 실제 리뷰가 없는 것들 정리
UPDATE public.hospitals
  SET rating = NULL
  WHERE rating IN (4.8, 4.9)
    AND (reviews_count IS NULL OR reviews_count = 0);

UPDATE public.treatments
  SET rating = NULL
  WHERE rating IN (4.8, 4.9)
    AND (reviews_count IS NULL OR reviews_count = 0);

-- 5. soft delete 컬럼 추가
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.normalized_inquiries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- P1: 핵심 조회 인덱스
-- ============================================================

-- 병원 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_hospitals_published_order
  ON public.hospitals (is_published, display_order NULLS LAST, created_at DESC);

-- 시술 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_treatments_published_order
  ON public.treatments (is_published, display_order NULLS LAST, created_at DESC);

-- 시술 병원별 조회
CREATE INDEX IF NOT EXISTS idx_treatments_hospital_id
  ON public.treatments (hospital_id);

-- 문의 상태별 조회
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created
  ON public.inquiries (status, created_at DESC);

-- 리드 병원별 조회
CREATE INDEX IF NOT EXISTS idx_hospital_leads_hospital_status
  ON public.hospital_leads (hospital_id, status, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospital_leads_inquiry
  ON public.hospital_leads (normalized_inquiry_id);

-- 알림 로그 조회
CREATE INDEX IF NOT EXISTS idx_notif_logs_created
  ON public.admin_notification_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_logs_inquiry
  ON public.admin_notification_logs (inquiry_id)
  WHERE inquiry_id IS NOT NULL;

-- ============================================================
-- P2: ARRAY/JSONB GIN 인덱스 (검색/필터 성능)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hospitals_tags_gin
  ON public.hospitals USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_hospitals_specialties_gin
  ON public.hospitals USING GIN (specialties);

CREATE INDEX IF NOT EXISTS idx_treatments_tags_gin
  ON public.treatments USING GIN (tags);
