-- 20260630_review_quickwins_hardening.sql
-- C레벨 진단 후속 보안 위생(저위험·가역적). 데이터 파괴 없음.
--   (1) 정책 0개 RLS 테이블 4종에 service_role 전용 정책 명시 — deny-all 의도를 코드로 박아
--       향후 누군가 광범위 permissive 정책을 급조하는 사고 방지 + 감리 증빙(CISO-6).
--   (2) RAG 검색 함수 anon/authenticated 직접 EXECUTE 회수 — 앱은 service_role(supabaseAdmin)
--       로만 호출(generateReply.ts·safeSearch.ts)하므로 기능 영향 없음. 비로그인 직접 호출
--       경로만 차단(다층방어, CISO-3).

-- ── (1) RLS 정책 명시 (기존 컨벤션 healo_<table>_service_role_all 과 동일) ──
DROP POLICY IF EXISTS healo_device_tokens_service_role_all ON device_tokens;
CREATE POLICY healo_device_tokens_service_role_all ON device_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS healo_progress_records_service_role_all ON progress_records;
CREATE POLICY healo_progress_records_service_role_all ON progress_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS healo_survey_responses_service_role_all ON survey_responses;
CREATE POLICY healo_survey_responses_service_role_all ON survey_responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS healo_symptom_alerts_service_role_all ON symptom_alerts;
CREATE POLICY healo_symptom_alerts_service_role_all ON symptom_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── (2) RAG 함수 비로그인 직접호출 차단 ──
-- 앱은 service_role(supabaseAdmin)로만 호출 → 비로그인 직접호출만 차단(기능 영향 없음).
-- ⚠️ EXECUTE 는 함수 기본값으로 PUBLIC 에 부여돼 anon 이 상속받으므로, anon/authenticated 만
--    회수하면 효과 없다. PUBLIC 에서 회수하고 service_role 에만 명시 부여해야 실제로 막힌다.
REVOKE EXECUTE ON FUNCTION
  public.rag_search_chunks_v1_1(vector, integer, text, text, boolean, boolean, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.rag_search_chunks_v1_1(vector, integer, text, text, boolean, boolean, integer)
  TO service_role;
