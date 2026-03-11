/**
 * ✅ 병원 성과 기반 자동 학습 시스템
 * 
 * 목적:
 * - 병원별 성과 데이터 수집
 * - 베이지안 스무딩 기반 점수 계산
 * - 데이터 기반 병원 추천
 * 
 * 설계:
 * - LLM 파인튜닝 아님
 * - 통계 기반 랭킹
 * - Cold start 처리 (베이지안)
 */

-- ========================================
-- 1. hospital_lead_assignments 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS hospital_lead_assignments (
  id BIGSERIAL PRIMARY KEY,
  
  -- 연결 정보
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  hospital_id INTEGER, -- NULL 허용 (초기에는 hospital_name만 있을 수 있음)
  treatment_id INTEGER, -- NULL 허용
  
  -- 컨텍스트 (추천 당시 상황)
  country TEXT,
  language TEXT,
  lead_quality TEXT CHECK (lead_quality IN ('hot', 'warm', 'cold', 'spam')),
  priority_score INTEGER,
  
  -- 결정 근거 (JSON)
  decision JSONB, -- { "reason": "high_score", "score": 85, "rank": 1, "alternatives": [...] }
  
  -- 할당 정보
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by TEXT DEFAULT 'manual', -- manual, auto, recommendation_engine
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assignments_inquiry 
ON hospital_lead_assignments(inquiry_id);

CREATE INDEX IF NOT EXISTS idx_assignments_hospital 
ON hospital_lead_assignments(hospital_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_treatment 
ON hospital_lead_assignments(treatment_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_context 
ON hospital_lead_assignments(hospital_id, treatment_id, country, language);

-- 코멘트
COMMENT ON TABLE hospital_lead_assignments IS '병원-리드 할당 기록 (피드백 루프용)';
COMMENT ON COLUMN hospital_lead_assignments.decision IS '할당 결정 근거 (JSON)';
COMMENT ON COLUMN hospital_lead_assignments.assigned_by IS '할당 방식: manual/auto/recommendation_engine';

-- ========================================
-- 2. hospital_performance_stats 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS hospital_performance_stats (
  id BIGSERIAL PRIMARY KEY,
  
  -- 차원 (Dimension)
  hospital_id INTEGER NOT NULL,
  treatment_id INTEGER, -- NULL = 전체 시술
  country TEXT, -- NULL = 전체 국가
  language TEXT, -- NULL = 전체 언어
  
  -- 집계 기간
  period TEXT NOT NULL CHECK (period IN ('all_time', 'last_30d', 'last_7d')),
  
  -- 퍼널 집계 (Funnel Counts)
  leads_sent INTEGER DEFAULT 0, -- 전달된 리드 수
  leads_viewed INTEGER DEFAULT 0, -- 병원이 확인한 수 (추후)
  leads_contacted INTEGER DEFAULT 0, -- 환자와 연락한 수
  leads_interested INTEGER DEFAULT 0, -- 관심 표명한 수
  leads_quoted INTEGER DEFAULT 0, -- 견적 제시한 수
  leads_booked INTEGER DEFAULT 0, -- 예약 확정
  leads_completed INTEGER DEFAULT 0, -- 시술 완료
  leads_rejected INTEGER DEFAULT 0, -- 관심 없음
  
  -- 속도 지표 (Speed Metrics)
  avg_first_response_minutes NUMERIC(10, 2), -- 평균 첫 응답 시간 (분)
  avg_booking_days NUMERIC(10, 2), -- 평균 예약 소요일
  
  -- 전환율 (Conversion Rates)
  interest_rate NUMERIC(5, 4), -- 관심 표명률 (interested / sent)
  booking_rate NUMERIC(5, 4), -- 예약 전환율 (booked / sent)
  completion_rate NUMERIC(5, 4), -- 시술 완료율 (completed / sent)
  
  -- 베이지안 점수 (Bayesian Smoothed Score)
  bayesian_score NUMERIC(10, 6), -- 0.0 ~ 1.0
  confidence_level NUMERIC(5, 4), -- 신뢰도 (0.0 ~ 1.0)
  
  -- 메타데이터
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  sample_size INTEGER DEFAULT 0 -- 실제 데이터 수 (n)
);

-- 복합 인덱스 (차원별 조회 최적화)
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_unique 
ON hospital_performance_stats(hospital_id, treatment_id, country, language, period)
WHERE treatment_id IS NOT NULL AND country IS NOT NULL AND language IS NOT NULL;

-- 부분 인덱스 (NULL 처리)
CREATE INDEX IF NOT EXISTS idx_performance_hospital_period 
ON hospital_performance_stats(hospital_id, period, bayesian_score DESC);

CREATE INDEX IF NOT EXISTS idx_performance_treatment 
ON hospital_performance_stats(treatment_id, period, bayesian_score DESC) 
WHERE treatment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_performance_country 
ON hospital_performance_stats(country, period, bayesian_score DESC) 
WHERE country IS NOT NULL;

-- 코멘트
COMMENT ON TABLE hospital_performance_stats IS '병원 성과 통계 (베이지안 스무딩 적용)';
COMMENT ON COLUMN hospital_performance_stats.bayesian_score IS '베이지안 스무딩 점수 (0~1)';
COMMENT ON COLUMN hospital_performance_stats.confidence_level IS '신뢰도: sample_size / (sample_size + m)';
COMMENT ON COLUMN hospital_performance_stats.sample_size IS '실제 데이터 수 (베이지안 계산용)';

-- ========================================
-- 3. 글로벌 평균 저장 테이블
-- ========================================

CREATE TABLE IF NOT EXISTS hospital_performance_global_avg (
  id SERIAL PRIMARY KEY,
  
  -- 글로벌 평균 (전체 병원 평균)
  global_interest_rate NUMERIC(5, 4) DEFAULT 0.5,
  global_booking_rate NUMERIC(5, 4) DEFAULT 0.3,
  global_completion_rate NUMERIC(5, 4) DEFAULT 0.25,
  
  -- 베이지안 파라미터
  bayesian_m INTEGER DEFAULT 10, -- 가중치 (prior strength)
  
  -- 메타데이터
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기값 삽입
INSERT INTO hospital_performance_global_avg (id, global_interest_rate, global_booking_rate, global_completion_rate, bayesian_m)
VALUES (1, 0.5, 0.3, 0.25, 10)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE hospital_performance_global_avg IS '글로벌 평균 및 베이지안 파라미터';
COMMENT ON COLUMN hospital_performance_global_avg.bayesian_m IS 'Prior strength (m): 클수록 전체 평균에 가까워짐';

-- ========================================
-- 4. 추천용 VIEW
-- ========================================

/**
 * v_hospital_recommendations
 * 
 * 용도: 특정 조건에 맞는 병원 추천
 * 입력: treatment_id, country, language (WHERE 절)
 * 출력: hospital_id, score, breakdown
 */
CREATE OR REPLACE VIEW v_hospital_recommendations AS
SELECT 
  hps.hospital_id,
  h.name as hospital_name,
  hps.treatment_id,
  hps.country,
  hps.language,
  hps.period,
  
  -- 베이지안 점수 (주 지표)
  hps.bayesian_score,
  hps.confidence_level,
  
  -- 상세 breakdown
  jsonb_build_object(
    'leads_sent', hps.leads_sent,
    'leads_interested', hps.leads_interested,
    'leads_booked', hps.leads_booked,
    'leads_completed', hps.leads_completed,
    'interest_rate', hps.interest_rate,
    'booking_rate', hps.booking_rate,
    'completion_rate', hps.completion_rate,
    'avg_response_minutes', hps.avg_first_response_minutes,
    'sample_size', hps.sample_size
  ) as breakdown,
  
  -- 랭킹 (동일 조건 내 순위)
  ROW_NUMBER() OVER (
    PARTITION BY hps.treatment_id, hps.country, hps.language, hps.period
    ORDER BY hps.bayesian_score DESC, hps.sample_size DESC
  ) as rank,
  
  -- 추천 강도
  CASE 
    WHEN hps.bayesian_score >= 0.7 AND hps.sample_size >= 10 THEN 'highly_recommended'
    WHEN hps.bayesian_score >= 0.5 AND hps.sample_size >= 5 THEN 'recommended'
    WHEN hps.bayesian_score >= 0.3 OR hps.sample_size >= 3 THEN 'consider'
    ELSE 'insufficient_data'
  END as recommendation_level
  
FROM hospital_performance_stats hps
LEFT JOIN hospitals h ON h.id = hps.hospital_id
WHERE hps.period = 'last_30d' -- 최근 30일 데이터 기준
ORDER BY hps.bayesian_score DESC;

COMMENT ON VIEW v_hospital_recommendations IS '병원 추천 (베이지안 점수 기반)';

-- ========================================
-- 5. 집계 헬퍼 함수
-- ========================================

/**
 * refresh_hospital_performance_stats
 * 
 * 용도: hospital_performance_stats 테이블 재계산
 * 호출: SELECT refresh_hospital_performance_stats();
 */
CREATE OR REPLACE FUNCTION refresh_hospital_performance_stats()
RETURNS TEXT AS $$
DECLARE
  v_global_avg RECORD;
  v_m INTEGER;
  v_rows_affected INTEGER := 0;
BEGIN
  -- 1. 글로벌 평균 조회
  SELECT * INTO v_global_avg FROM hospital_performance_global_avg WHERE id = 1;
  v_m := v_global_avg.bayesian_m;

  -- 2. 기존 데이터 삭제 (전체 재계산)
  DELETE FROM hospital_performance_stats;

  -- 3. all_time 집계 삽입
  INSERT INTO hospital_performance_stats (
    hospital_id,
    treatment_id,
    country,
    language,
    period,
    leads_sent,
    leads_contacted,
    leads_interested,
    leads_quoted,
    leads_booked,
    leads_completed,
    leads_rejected,
    avg_first_response_minutes,
    interest_rate,
    booking_rate,
    completion_rate,
    sample_size,
    bayesian_score,
    confidence_level,
    last_updated_at
  )
  SELECT 
    -- 차원
    COALESCE(hla.hospital_id, -1) as hospital_id,
    hla.treatment_id,
    hla.country,
    hla.language,
    'all_time' as period,
    
    -- 퍼널 카운트
    COUNT(*) as leads_sent,
    COUNT(CASE WHEN hr.response_status IN ('contacted', 'consultation', 'quoted', 'booked', 'completed') THEN 1 END) as leads_contacted,
    COUNT(CASE WHEN hr.response_status = 'interested' THEN 1 END) as leads_interested,
    COUNT(CASE WHEN hr.response_status = 'quoted' THEN 1 END) as leads_quoted,
    COUNT(CASE WHEN hr.response_status = 'booked' THEN 1 END) as leads_booked,
    COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END) as leads_completed,
    COUNT(CASE WHEN hr.response_status = 'not_interested' THEN 1 END) as leads_rejected,
    
    -- 속도
    AVG(EXTRACT(EPOCH FROM (hr.response_at - hr.sent_at)) / 60) as avg_first_response_minutes,
    
    -- 전환율 (raw)
    COUNT(CASE WHEN hr.response_status = 'interested' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) as interest_rate,
    COUNT(CASE WHEN hr.response_status IN ('booked', 'completed') THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) as booking_rate,
    COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) as completion_rate,
    
    -- 샘플 사이즈
    COUNT(*) as sample_size,
    
    -- 베이지안 점수 (completion_rate 기준)
    (
      v_m * v_global_avg.global_completion_rate + 
      COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * COUNT(*)
    ) / (v_m + COUNT(*)) as bayesian_score,
    
    -- 신뢰도
    COUNT(*)::NUMERIC / (v_m + COUNT(*)) as confidence_level,
    
    NOW() as last_updated_at
    
  FROM hospital_lead_assignments hla
  LEFT JOIN hospital_responses hr ON hr.inquiry_id = hla.inquiry_id
  WHERE hla.hospital_id IS NOT NULL
  GROUP BY hla.hospital_id, hla.treatment_id, hla.country, hla.language;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 4. last_30d 집계 (동일 구조, WHERE 조건만 추가)
  INSERT INTO hospital_performance_stats (
    hospital_id, treatment_id, country, language, period,
    leads_sent, leads_contacted, leads_interested, leads_quoted, leads_booked, leads_completed, leads_rejected,
    avg_first_response_minutes, interest_rate, booking_rate, completion_rate,
    sample_size, bayesian_score, confidence_level, last_updated_at
  )
  SELECT 
    COALESCE(hla.hospital_id, -1), hla.treatment_id, hla.country, hla.language, 'last_30d',
    COUNT(*),
    COUNT(CASE WHEN hr.response_status IN ('contacted', 'consultation', 'quoted', 'booked', 'completed') THEN 1 END),
    COUNT(CASE WHEN hr.response_status = 'interested' THEN 1 END),
    COUNT(CASE WHEN hr.response_status = 'quoted' THEN 1 END),
    COUNT(CASE WHEN hr.response_status IN ('booked', 'completed') THEN 1 END),
    COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END),
    COUNT(CASE WHEN hr.response_status = 'not_interested' THEN 1 END),
    AVG(EXTRACT(EPOCH FROM (hr.response_at - hr.sent_at)) / 60),
    COUNT(CASE WHEN hr.response_status = 'interested' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0),
    COUNT(CASE WHEN hr.response_status IN ('booked', 'completed') THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0),
    COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0),
    COUNT(*),
    (v_m * v_global_avg.global_completion_rate + COUNT(CASE WHEN hr.response_status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * COUNT(*)) / (v_m + COUNT(*)),
    COUNT(*)::NUMERIC / (v_m + COUNT(*)),
    NOW()
  FROM hospital_lead_assignments hla
  LEFT JOIN hospital_responses hr ON hr.inquiry_id = hla.inquiry_id
  WHERE hla.hospital_id IS NOT NULL
    AND hla.assigned_at > NOW() - INTERVAL '30 days'
  GROUP BY hla.hospital_id, hla.treatment_id, hla.country, hla.language;

  GET DIAGNOSTICS v_rows_affected = v_rows_affected + ROW_COUNT;

  RETURN 'Successfully refreshed ' || v_rows_affected || ' rows in hospital_performance_stats';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_hospital_performance_stats IS '병원 성과 통계 전체 재계산';

-- ========================================
-- 6. 운영자용 대시보드 VIEW
-- ========================================

/**
 * v_hospital_performance_dashboard
 * 
 * 용도: 병원별 성과 한눈에 보기
 */
CREATE OR REPLACE VIEW v_hospital_performance_dashboard AS
SELECT 
  h.id as hospital_id,
  h.name as hospital_name,
  hps.period,
  hps.leads_sent,
  hps.leads_booked,
  hps.leads_completed,
  ROUND(hps.booking_rate * 100, 1) as booking_rate_pct,
  ROUND(hps.completion_rate * 100, 1) as completion_rate_pct,
  ROUND(hps.avg_first_response_minutes / 60, 1) as avg_response_hours,
  ROUND(hps.bayesian_score * 100, 1) as score,
  ROUND(hps.confidence_level * 100, 1) as confidence_pct,
  hps.sample_size,
  CASE 
    WHEN hps.bayesian_score >= 0.7 THEN '🔥 Excellent'
    WHEN hps.bayesian_score >= 0.5 THEN '⭐ Good'
    WHEN hps.bayesian_score >= 0.3 THEN '📊 Average'
    ELSE '📉 Below Average'
  END as performance_tier
FROM hospital_performance_stats hps
JOIN hospitals h ON h.id = hps.hospital_id
WHERE hps.treatment_id IS NULL -- 전체 시술 기준
  AND hps.country IS NULL -- 전체 국가
  AND hps.language IS NULL -- 전체 언어
ORDER BY hps.period, hps.bayesian_score DESC;

COMMENT ON VIEW v_hospital_performance_dashboard IS '병원 성과 대시보드 (운영자용)';

-- ========================================
-- 7. 트리거: hospital_responses 변경 시 자동 갱신
-- ========================================

-- 주의: 실시간 갱신은 부하가 클 수 있으므로, 선택적으로 활성화
-- 대신 주기적 배치 실행 권장 (예: 매일 새벽 cron)

-- CREATE OR REPLACE FUNCTION trigger_refresh_performance()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM refresh_hospital_performance_stats();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER after_hospital_response_update
-- AFTER INSERT OR UPDATE ON hospital_responses
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION trigger_refresh_performance();

-- ========================================
-- 8. 샘플 데이터 (테스트용)
-- ========================================

-- hospital_lead_assignments에 샘플 데이터 추가 예시 (주석 처리)
-- INSERT INTO hospital_lead_assignments (inquiry_id, hospital_id, treatment_id, country, language, lead_quality, priority_score, decision, assigned_by)
-- VALUES 
--   (1, 1, 1, 'KR', 'ko', 'hot', 85, '{"reason": "high_score", "score": 85}', 'manual'),
--   (2, 1, 1, 'KR', 'ko', 'warm', 65, '{"reason": "medium_score", "score": 65}', 'manual'),
--   (3, 2, 1, 'KR', 'ko', 'hot', 80, '{"reason": "high_score", "score": 80}', 'manual');

-- 통계 계산 테스트
-- SELECT refresh_hospital_performance_stats();

-- 추천 조회 테스트
-- SELECT * FROM v_hospital_recommendations 
-- WHERE treatment_id = 1 AND country = 'KR' AND language = 'ko'
-- ORDER BY bayesian_score DESC LIMIT 5;
