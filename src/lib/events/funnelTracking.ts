/**
 * healwith: 퍼널 추적 시스템
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
export async function trackFunnelEvent(meta: FunnelEventMeta): Promise<void> {
  try {
    // DB 컬럼명(snake_case)으로 매핑. PII 미포함(집계용 메타만). created_at 은 DB DEFAULT NOW().
    const row = {
      stage: meta.stage,
      session_id: meta.sessionId ?? null,
      page: meta.page ?? null,
      utm_source: meta.utm?.source ?? null,
      utm_medium: meta.utm?.medium ?? null,
      utm_campaign: meta.utm?.campaign ?? null,
      language: meta.language ?? null,
      country: meta.country ?? null,
      treatment_type: meta.treatmentType ?? null,
      duration: meta.duration ?? null,
      drop_reason: meta.dropReason ?? null,
    };

    // server-only 인 admin 클라이언트는 호출 시점(서버 런타임)에만 lazy import —
    // 이 모듈을 클라이언트가 import 해도 번들이 깨지지 않게 한다.
    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");
    // funnel_events 는 아직 생성 타입에 없어 any 캐스트 (kpi.ts 의 survey_responses 패턴과 동일)
    const { error } = await (supabaseAdmin as any).from("funnel_events").insert(row);
    if (error) {
      console.error(`[funnelTracking] insert 실패(무시): ${error.message ?? error}`);
    }
  } catch (error: any) {
    // 추적 실패는 메인 로직에 영향 없음 (fail-safe) — env 미설정·서버 외 환경 등 조용히 무시
    console.error(`[funnelTracking] 이벤트 추적 실패(무시): ${error?.message ?? error}`);
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
