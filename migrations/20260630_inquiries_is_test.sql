-- 20260630_inquiries_is_test.sql
-- KHIDI KPI 테스트/실제 데이터 분리 — 단일 표식 inquiries.is_test.
--
-- 왜: 운영자(PO·코디)가 오픈 후에도 실폼으로 테스트하면 그 데이터가 평가 KPI에 섞인다.
--     '테스트'는 문의(inquiry) 한 곳에만 표시하고, 상담/설문/유치는 inquiry_id 로 따라가
--     제외한다(다운스트림에 도장을 복사하지 않아 생성지점 누락으로 새는 사고를 원천 차단).
--
-- 가역성: 컬럼·인덱스 '추가' + 함수 'CREATE OR REPLACE' 뿐. 데이터 파괴 없음 → 자동적용 가능.
-- 재실행 안전(idempotent): IF NOT EXISTS / OR REPLACE.

-- ── 1) 표식 컬럼 ───────────────────────────────────────────────
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN inquiries.is_test IS
  '테스트/데모 문의 표식. 사무실IP·테스트이메일·수동도장(src/lib/khidi/testData.ts)으로 생성 시 true. KPI·전환깔때기·증빙은 기본 제외.';

-- ── 2) 기존 데모 시드(2026-06-15) 백필 ────────────────────────
-- 기존 cleanup_test_seed 마커를 새 단일 표식으로 흡수(둘이 갈라지지 않게).
UPDATE inquiries SET is_test = true
WHERE is_test = false AND intake ? '_test_seed';

-- ── 3) '실적만(is_test=false)' 조회 가속용 부분 인덱스 ─────────
CREATE INDEX IF NOT EXISTS idx_inquiries_real_created_at
  ON inquiries(created_at) WHERE is_test = false;

-- ── 4) 전환 깔때기 RPC 3종 — p_include_test(기본 false) 추가 ───
-- CREATE OR REPLACE 는 시그니처(인자 목록)를 못 바꾸므로 기존 정의를 먼저 DROP.
DROP FUNCTION IF EXISTS public.conversion_funnel(timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.conversion_funnel_by_country(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.conversion_funnel_by_org(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.conversion_funnel(
  p_from timestamptz, p_to timestamptz,
  p_nationality text DEFAULT NULL, p_include_test boolean DEFAULT false
)
RETURNS TABLE(total_inquiries bigint, pre_consult bigint, visa_or_quote bigint, admitted bigint, followup bigint, lost bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  WITH inq AS (
    SELECT i.id, i.outcome,
      EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed') AS pre_done,
      EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed') AS followup_done,
      EXISTS(SELECT 1 FROM cost_estimates e JOIN consultation_sessions c ON c.id=e.consultation_id WHERE c.inquiry_id=i.id AND e.quotation_issued_at IS NOT NULL) AS quote_done,
      EXISTS(SELECT 1 FROM visa_applications v JOIN consultation_sessions c ON c.id=v.consultation_id WHERE c.inquiry_id=i.id) AS visa_done
    FROM inquiries i
    WHERE i.created_at >= p_from AND i.created_at < p_to
      AND (p_nationality IS NULL OR i.nationality = p_nationality)
      AND (p_include_test OR i.is_test = false)
  )
  SELECT count(*)::bigint,
    count(*) FILTER (WHERE pre_done)::bigint,
    count(*) FILTER (WHERE quote_done OR visa_done)::bigint,
    count(*) FILTER (WHERE outcome='admitted')::bigint,
    count(*) FILTER (WHERE followup_done)::bigint,
    count(*) FILTER (WHERE outcome='lost')::bigint
  FROM inq;
$function$;

CREATE OR REPLACE FUNCTION public.conversion_funnel_by_country(
  p_from timestamptz, p_to timestamptz, p_include_test boolean DEFAULT false
)
RETURNS TABLE(nationality text, total bigint, pre_consult bigint, admitted bigint, followup bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT COALESCE(i.nationality,'(미상)') AS nationality,
    count(*)::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='pre_consultation' AND c.status='completed'))::bigint,
    count(*) FILTER (WHERE i.outcome='admitted')::bigint,
    count(*) FILTER (WHERE EXISTS(SELECT 1 FROM consultation_sessions c WHERE c.inquiry_id=i.id AND c.session_type='follow_up' AND c.status='completed'))::bigint
  FROM inquiries i
  WHERE i.created_at >= p_from AND i.created_at < p_to
    AND (p_include_test OR i.is_test = false)
  GROUP BY COALESCE(i.nationality,'(미상)')
  ORDER BY count(*) DESC;
$function$;

-- by_org 는 세션 기준 집계 → 세션의 inquiry 가 테스트면 제외(LEFT JOIN 으로 inquiry 없는 세션은 보존).
CREATE OR REPLACE FUNCTION public.conversion_funnel_by_org(
  p_from timestamptz, p_to timestamptz, p_include_test boolean DEFAULT false
)
RETURNS TABLE(hospital_id uuid, hospital_name text, kind text, total_sessions bigint, pre_consult bigint, followup bigint, completed bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT
    h.id,
    COALESCE(h.name, '(미지정)'),
    CASE WHEN h.slug LIKE 'immunehospital%' THEN '한방(참여기관)'
         WHEN h.id IS NULL THEN '미지정'
         ELSE '대학병원(협진)' END AS kind,
    count(*)::bigint,
    count(*) FILTER (WHERE c.session_type='pre_consultation' AND c.status='completed')::bigint,
    count(*) FILTER (WHERE c.session_type='follow_up' AND c.status='completed')::bigint,
    count(*) FILTER (WHERE c.status='completed')::bigint
  FROM consultation_sessions c
  LEFT JOIN hospitals h ON h.id = c.hospital_id
  LEFT JOIN inquiries i ON i.id = c.inquiry_id
  WHERE c.created_at >= p_from AND c.created_at < p_to
    AND (p_include_test OR COALESCE(i.is_test, false) = false)
  GROUP BY h.id, h.name, h.slug
  ORDER BY count(*) DESC;
$function$;
