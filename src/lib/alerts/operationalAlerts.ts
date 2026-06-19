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
 * ✅ 누적 임계 카운터 — DB sliding window (cross-isolate)
 *
 * 인메모리(AlertCounter)는 Vercel isolate 마다 독립이라 "5분 내 N건" 류 누적 임계가
 * 단일 인스턴스 안에서만 정확 → 분산 환경에서 임계 도달을 놓침.
 * `alert_counter_increment(key, window_ms)` RPC 로 DB 집계(migrations/20260619_alert_counters.sql).
 *
 * RPC 실패/미적용 시 → 인메모리로 fallback(알림을 잃지 않음, 현행 동작 유지).
 * 마이그레이션 적용 전에도 안전하게 동작하고, 적용되면 자동으로 DB 집계로 전환된다.
 */
async function incrementCounter(key: string, windowMs: number): Promise<number> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any).rpc("alert_counter_increment", {
      p_key: key,
      p_window_ms: windowMs,
    });
    if (error || typeof data !== "number") {
      // RPC 미적용(함수 없음)·DB 오류 → 인메모리로 fallback
      return alertCounter.increment(key, windowMs);
    }
    return data;
  } catch {
    return alertCounter.increment(key, windowMs);
  }
}

/**
 * 운영자에게 알림 도달 — 실제 채널 연결.
 *
 * 1) 콘솔 로그 (Vercel 로그)
 * 2) Sentry (NEXT_PUBLIC_SENTRY_DSN 설정 시 — 서버 Sentry 가 instrumentation.ts 로 활성)
 * 3) 이메일 (critical/warning 만, Resend/SES via sendEmail). 수신자:
 *    OPERATIONAL_ALERT_EMAIL → 없으면 ADMIN_EMAIL_ALLOWLIST 첫 주소.
 *
 * 누적 임계 집계는 DB sliding window(`incrementCounter` → `alert_counter_increment` RPC)로
 * cross-isolate 정확. RPC 미적용/실패 시 인메모리(AlertCounter)로 fallback(현행 동작 유지).
 */
async function sendAlert(alert: AlertMeta): Promise<void> {
  // 1) 콘솔 출력 (개발/운영 로그) — 실패해도 나머지 채널 시도
  const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
  console[logLevel](`[ALERT:${alert.severity}] ${alert.type}:`, {
    message: alert.message,
    details: alert.details,
    threshold: alert.threshold,
    currentValue: alert.currentValue,
    timestamp: alert.timestamp,
  });

  // 2) Sentry — 서버 Sentry 활성 시 이벤트로 보고
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      const level =
        alert.severity === 'critical' ? 'error'
        : alert.severity === 'warning' ? 'warning'
        : 'info';
      Sentry.captureMessage(`[ALERT:${alert.type}] ${alert.message}`, {
        level: level as any,
        extra: {
          details: alert.details,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
        },
      });
    }
  } catch (error) {
    console.error('[operationalAlerts] Sentry 보고 실패:', error);
  }

  // 3) 이메일 — critical/warning 만 (info=고가치리드 등은 피로도 방지로 제외)
  try {
    if (alert.severity !== 'info') {
      const recipient =
        process.env.OPERATIONAL_ALERT_EMAIL ||
        (process.env.ADMIN_EMAIL_ALLOWLIST || "").split(",")[0]?.trim();
      if (recipient) {
        const { sendEmail } = await import("@/lib/email/sendEmail");
        const rows = [
          `type: ${alert.type}`,
          `severity: ${alert.severity}`,
          `message: ${alert.message}`,
          alert.threshold != null ? `threshold: ${alert.threshold}` : "",
          alert.currentValue != null ? `currentValue: ${alert.currentValue}` : "",
          `timestamp: ${alert.timestamp}`,
          alert.details ? `details: ${JSON.stringify(alert.details)}` : "",
        ].filter(Boolean);
        await sendEmail({
          to: recipient,
          subject: `[healwith ${alert.severity}] ${alert.type}`,
          html: `<pre style="font:13px/1.5 monospace">${rows.join("\n")}</pre>`,
          text: rows.join("\n"),
          tags: { kind: "operational_alert", severity: alert.severity },
        });
      }
    }
  } catch (error) {
    // 알림 실패해도 메인 로직에 영향 없음
    console.error('[operationalAlerts] 이메일 알림 실패:', error);
  }
}

/**
 * ✅ 에러율 모니터링
 */
export async function checkErrorRate(): Promise<void> {
  const count = await incrementCounter('errors', ALERT_THRESHOLDS.ERROR_RATE.window);

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
  const count = await incrementCounter('blocks', ALERT_THRESHOLDS.BLOCK_RATE.window);

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
  const count = await incrementCounter('encryption_failures', 10 * 60 * 1000); // 10분

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
 * ✅ 알림 카운터 리셋 (수동) — 인메모리 + DB 둘 다 비움
 * DB 리셋은 best-effort 비동기(실패해도 인메모리는 즉시 리셋).
 */
export function resetAlertCounter(type: 'errors' | 'blocks' | 'encryption_failures'): void {
  alertCounter.reset(type);
  // DB 카운터도 비움(미적용/실패 시 조용히 무시)
  (async () => {
    try {
      const { supabaseAdmin } = await import("../rag/supabaseAdmin");
      await (supabaseAdmin as any).rpc("alert_counter_reset", { p_key: type });
    } catch {
      /* best-effort */
    }
  })();
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
