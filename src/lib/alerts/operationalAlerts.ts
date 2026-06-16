/**
 * healwith: 운영 알림 시스템
 * 
 * 목적:
 * - error/abuse 누적 시 자동 알림
 * - 운영자가 즉시 대응해야 할 상황 감지
 * - 임계값 기반 알림 (과다 알림 방지)
 * 
 * 원칙:
 * - 중요한 것만 알림 (피로도 최소화)
 * - 임계값 설정 가능
 * - 알림 실패해도 메인 로직 영향 없음
 */

/**
 * 알림 심각도
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * 알림 타입
 */
export type AlertType =
  | 'high_error_rate'          // 에러율 급증
  | 'high_block_rate'          // 차단율 급증
  | 'encryption_failures'      // 암호화 연속 실패
  | 'db_connection_issues'     // DB 연결 문제
  | 'spam_attack'              // 스팸 공격
  | 'no_inquiries'             // 문의 급감 (시스템 문제?)
  | 'high_priority_lead';      // 고가치 리드 유입

/**
 * 알림 메타데이터
 */
export interface AlertMeta {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  threshold?: number;
  currentValue?: number;
  timestamp: string;
}

/**
 * ✅ 알림 임계값 설정
 */
const ALERT_THRESHOLDS = {
  // 에러율 (5분 내)
  ERROR_RATE: {
    warning: 5,   // 5개 이상: 경고
    critical: 10, // 10개 이상: 긴급
    window: 5 * 60 * 1000, // 5분
  },

  // 차단율 (1시간 내)
  BLOCK_RATE: {
    warning: 20,   // 20개 이상: 경고 (봇 공격?)
    critical: 50,  // 50개 이상: 긴급
    window: 60 * 60 * 1000, // 1시간
  },

  // 암호화 실패 (연속)
  ENCRYPTION_FAILURES: {
    warning: 3,    // 3회 연속: 경고
    critical: 5,   // 5회 연속: 긴급
  },

  // 문의 급감 (1시간 내)
  NO_INQUIRIES: {
    warning: 0,    // 1시간 동안 0건: 경고
    window: 60 * 60 * 1000, // 1시간
  },

  // 고가치 리드 (즉시 알림)
  HIGH_PRIORITY_LEAD: {
    minScore: 80,  // 80점 이상: 즉시 알림
  },
} as const;

/**
 * ✅ 메모리 기반 카운터 (서버리스 환경)
 */
class AlertCounter {
  private counters: Map<string, { count: number; firstTime: number; lastTime: number }> = new Map();

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const existing = this.counters.get(key);

    if (!existing || now - existing.firstTime > windowMs) {
      // 새 윈도우 시작
      this.counters.set(key, { count: 1, firstTime: now, lastTime: now });
      return 1;
    }

    // 기존 윈도우 내 카운트 증가
    existing.count += 1;
    existing.lastTime = now;
    this.counters.set(key, existing);
    return existing.count;
  }

  get(key: string): number {
    return this.counters.get(key)?.count || 0;
  }

  reset(key: string): void {
    this.counters.delete(key);
  }

  // 자동 cleanup (오래된 카운터 제거)
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간

    for (const [key, value] of this.counters.entries()) {
      if (now - value.lastTime > maxAge) {
        this.counters.delete(key);
      }
    }
  }
}

const alertCounter = new AlertCounter();

// 주기적 cleanup
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
  setInterval(() => alertCounter.cleanup(), 60 * 60 * 1000); // 1시간마다
}

/**
 * ✅ 알림 전송 (확장 가능)
 * 
 * 현재: 콘솔 로그
 * 추후: Slack, Email, SMS 등
 */
async function sendAlert(alert: AlertMeta): Promise<void> {
  try {
    // 콘솔 출력 (개발/운영 로그)
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    console[logLevel](`[ALERT:${alert.severity}] ${alert.type}:`, {
      message: alert.message,
      details: alert.details,
      threshold: alert.threshold,
      currentValue: alert.currentValue,
      timestamp: alert.timestamp,
    });

    // TODO: 외부 알림 시스템 연동
    // - Slack Webhook
    // - Email (SendGrid, AWS SES)
    // - SMS (Twilio)
    // - Push Notification
    
    // 예시: Slack 연동
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await fetch(process.env.SLACK_WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
    //       attachments: [{ text: JSON.stringify(alert.details, null, 2) }]
    //     })
    //   });
    // }

  } catch (error) {
    // 알림 실패해도 조용히 넘어감 (메인 로직에 영향 없음)
    console.error('[operationalAlerts] Failed to send alert:', error);
  }
}

/**
 * ✅ 에러율 모니터링
 */
export async function checkErrorRate(): Promise<void> {
  const count = alertCounter.increment('errors', ALERT_THRESHOLDS.ERROR_RATE.window);

  if (count >= ALERT_THRESHOLDS.ERROR_RATE.critical) {
    await sendAlert({
      type: 'high_error_rate',
      severity: 'critical',
      message: `Critical: ${count} errors in last 5 minutes`,
      threshold: ALERT_THRESHOLDS.ERROR_RATE.critical,
      currentValue: count,
      details: { window: '5 minutes' },
      timestamp: new Date().toISOString(),
    });
  } else if (count >= ALERT_THRESHOLDS.ERROR_RATE.warning) {
    await sendAlert({
      type: 'high_error_rate',
      severity: 'warning',
      message: `Warning: ${count} errors in last 5 minutes`,
      threshold: ALERT_THRESHOLDS.ERROR_RATE.warning,
      currentValue: count,
      details: { window: '5 minutes' },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ✅ 차단율 모니터링 (스팸 공격 감지)
 */
export async function checkBlockRate(): Promise<void> {
  const count = alertCounter.increment('blocks', ALERT_THRESHOLDS.BLOCK_RATE.window);

  if (count >= ALERT_THRESHOLDS.BLOCK_RATE.critical) {
    await sendAlert({
      type: 'spam_attack',
      severity: 'critical',
      message: `Potential spam attack: ${count} blocks in last hour`,
      threshold: ALERT_THRESHOLDS.BLOCK_RATE.critical,
      currentValue: count,
      details: { 
        window: '1 hour',
        action: 'Consider tightening rate limits'
      },
      timestamp: new Date().toISOString(),
    });
  } else if (count >= ALERT_THRESHOLDS.BLOCK_RATE.warning) {
    await sendAlert({
      type: 'high_block_rate',
      severity: 'warning',
      message: `High block rate: ${count} blocks in last hour`,
      threshold: ALERT_THRESHOLDS.BLOCK_RATE.warning,
      currentValue: count,
      details: { window: '1 hour' },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ✅ 암호화 실패 모니터링
 */
export async function checkEncryptionFailures(): Promise<void> {
  const count = alertCounter.increment('encryption_failures', 10 * 60 * 1000); // 10분

  if (count >= ALERT_THRESHOLDS.ENCRYPTION_FAILURES.critical) {
    await sendAlert({
      type: 'encryption_failures',
      severity: 'critical',
      message: `Critical: ${count} consecutive encryption failures`,
      threshold: ALERT_THRESHOLDS.ENCRYPTION_FAILURES.critical,
      currentValue: count,
      details: { 
        action: 'Check SUPABASE_ENCRYPTION_KEY environment variable'
      },
      timestamp: new Date().toISOString(),
    });
  } else if (count >= ALERT_THRESHOLDS.ENCRYPTION_FAILURES.warning) {
    await sendAlert({
      type: 'encryption_failures',
      severity: 'warning',
      message: `Warning: ${count} encryption failures`,
      threshold: ALERT_THRESHOLDS.ENCRYPTION_FAILURES.warning,
      currentValue: count,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ✅ 고가치 리드 알림
 */
export async function alertHighPriorityLead(leadInfo: {
  inquiryId: number;
  priorityScore: number;
  country?: string;
  treatmentType?: string;
}): Promise<void> {
  if (leadInfo.priorityScore >= ALERT_THRESHOLDS.HIGH_PRIORITY_LEAD.minScore) {
    await sendAlert({
      type: 'high_priority_lead',
      severity: 'info',
      message: `High-priority lead received (score: ${leadInfo.priorityScore})`,
      details: {
        inquiryId: leadInfo.inquiryId,
        score: leadInfo.priorityScore,
        country: leadInfo.country,
        treatment: leadInfo.treatmentType,
        action: 'Review and respond promptly'
      },
      threshold: ALERT_THRESHOLDS.HIGH_PRIORITY_LEAD.minScore,
      currentValue: leadInfo.priorityScore,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ✅ 알림 카운터 리셋 (수동)
 */
export function resetAlertCounter(type: 'errors' | 'blocks' | 'encryption_failures'): void {
  alertCounter.reset(type);
}

/**
 * ✅ 알림 설정 조회 (운영자용)
 */
export function getAlertThresholds() {
  return ALERT_THRESHOLDS;
}

/**
 * ✅ 운영 대시보드용 알림 히스토리
 * 
 * DB 스키마 (추가 권장):
 * - operational_alerts 테이블
 *   - id
 *   - type (alert_type)
 *   - severity
 *   - message
 *   - details JSONB
 *   - threshold
 *   - current_value
 *   - acknowledged BOOLEAN DEFAULT FALSE
 *   - acknowledged_at TIMESTAMPTZ
 *   - acknowledged_by TEXT
 *   - created_at TIMESTAMPTZ DEFAULT NOW()
 * 
 * 쿼리 예시:
 * ```sql
 * -- 미확인 알림
 * SELECT * FROM operational_alerts 
 * WHERE acknowledged = FALSE 
 * ORDER BY severity DESC, created_at DESC;
 * 
 * -- 최근 24시간 알림 통계
 * SELECT 
 *   type,
 *   severity,
 *   COUNT(*) as count
 * FROM operational_alerts
 * WHERE created_at > NOW() - INTERVAL '24 hours'
 * GROUP BY type, severity
 * ORDER BY count DESC;
 * ```
 */
