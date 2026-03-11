/**
 * HEALO: 퍼널 추적 시스템
 * 
 * 목적:
 * - 문의 전환 지점 계측 가능하게 만들기
 * - 어디서 이탈하는지 파악
 * - A/B 테스트 기반 마련
 * 
 * 원칙:
 * - 기존 API 동작에 영향 없음 (fail-safe)
 * - 추적 실패해도 문의 처리는 계속
 * - 개인정보 제외, 집계 데이터만
 */

/**
 * 퍼널 단계 정의
 */
export type FunnelStage =
  | 'page_view'           // 페이지 조회
  | 'form_start'          // 폼 입력 시작
  | 'form_step1_submit'   // Step 1 제출
  | 'form_step2_view'     // Step 2 진입
  | 'form_step2_submit'   // Step 2 제출
  | 'form_complete'       // 완료
  | 'form_blocked'        // 차단됨
  | 'form_error'          // 에러 발생
  | 'chat_start'          // 챗봇 시작
  | 'chat_message'        // 챗봇 메시지
  | 'chat_blocked'        // 챗봇 차단
  | 'chat_error';         // 챗봇 에러

/**
 * 퍼널 이벤트 메타데이터
 */
export interface FunnelEventMeta {
  /** 퍼널 단계 */
  stage: FunnelStage;
  /** 세션 ID (익명) */
  sessionId?: string;
  /** 페이지 경로 */
  page?: string;
  /** UTM 파라미터 */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  /** 언어 */
  language?: string;
  /** 국가 */
  country?: string;
  /** 시술 타입 */
  treatmentType?: string;
  /** 소요 시간 (초) */
  duration?: number;
  /** 이탈 사유 */
  dropReason?: string;
}

/**
 * 퍼널 이벤트 데이터 (DB 저장용)
 */
export interface FunnelEvent {
  stage: FunnelStage;
  sessionId?: string;
  page?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  language?: string;
  country?: string;
  treatmentType?: string;
  duration?: number;
  dropReason?: string;
  timestamp: string;
}

/**
 * ✅ 퍼널 이벤트 추적
 * 
 * 실패해도 메인 로직에 영향 없음 (fail-safe)
 * 
 * @param meta 이벤트 메타데이터
 */
export function trackFunnelEvent(meta: FunnelEventMeta): void {
  try {
    const event: FunnelEvent = {
      stage: meta.stage,
      sessionId: meta.sessionId,
      page: meta.page,
      utmSource: meta.utm?.source,
      utmMedium: meta.utm?.medium,
      utmCampaign: meta.utm?.campaign,
      language: meta.language,
      country: meta.country,
      treatmentType: meta.treatmentType,
      duration: meta.duration,
      dropReason: meta.dropReason,
      timestamp: new Date().toISOString(),
    };

    // 콘솔 로그 (개발/디버깅용)
    console.log(`[funnel:${meta.stage}]`, event);

    // TODO: DB에 저장 (비동기, fail-safe)
    // 추후 funnel_events 테이블에 저장
    // await supabaseAdmin.from('funnel_events').insert(event);

  } catch (error) {
    // 추적 실패해도 조용히 넘어감 (메인 로직에 영향 없음)
    console.error('[funnelTracking] Failed to track event:', error);
  }
}

/**
 * ✅ 퍼널 전환율 계산 헬퍼
 * 
 * 운영 대시보드용 쿼리 예시:
 * 
 * ```sql
 * -- 전체 퍼널 전환율
 * SELECT 
 *   stage,
 *   COUNT(*) as count,
 *   COUNT(*) * 100.0 / (SELECT COUNT(*) FROM funnel_events WHERE stage = 'page_view') as conversion_rate
 * FROM funnel_events
 * WHERE timestamp > NOW() - INTERVAL '7 days'
 * GROUP BY stage
 * ORDER BY 
 *   CASE stage
 *     WHEN 'page_view' THEN 1
 *     WHEN 'form_start' THEN 2
 *     WHEN 'form_step1_submit' THEN 3
 *     WHEN 'form_step2_view' THEN 4
 *     WHEN 'form_step2_submit' THEN 5
 *     WHEN 'form_complete' THEN 6
 *   END;
 * 
 * -- UTM 소스별 전환율
 * SELECT 
 *   utm_source,
 *   COUNT(CASE WHEN stage = 'page_view' THEN 1 END) as views,
 *   COUNT(CASE WHEN stage = 'form_complete' THEN 1 END) as completions,
 *   COUNT(CASE WHEN stage = 'form_complete' THEN 1 END) * 100.0 / 
 *     NULLIF(COUNT(CASE WHEN stage = 'page_view' THEN 1 END), 0) as conversion_rate
 * FROM funnel_events
 * WHERE timestamp > NOW() - INTERVAL '7 days'
 * GROUP BY utm_source
 * ORDER BY completions DESC;
 * ```
 */
export const FUNNEL_QUERIES = {
  CONVERSION_RATE: `
    SELECT 
      stage,
      COUNT(*) as count,
      COUNT(*) * 100.0 / (SELECT COUNT(*) FROM funnel_events WHERE stage = 'page_view') as conversion_rate
    FROM funnel_events
    WHERE timestamp > NOW() - INTERVAL '7 days'
    GROUP BY stage
  `,
  
  UTM_PERFORMANCE: `
    SELECT 
      utm_source,
      COUNT(CASE WHEN stage = 'form_complete' THEN 1 END) as completions,
      COUNT(CASE WHEN stage = 'form_complete' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN stage = 'page_view' THEN 1 END), 0) as conversion_rate
    FROM funnel_events
    WHERE timestamp > NOW() - INTERVAL '7 days'
    GROUP BY utm_source
  `,
  
  DROP_REASONS: `
    SELECT 
      drop_reason,
      COUNT(*) as count
    FROM funnel_events
    WHERE stage IN ('form_blocked', 'form_error')
      AND timestamp > NOW() - INTERVAL '7 days'
    GROUP BY drop_reason
    ORDER BY count DESC
  `,
} as const;
