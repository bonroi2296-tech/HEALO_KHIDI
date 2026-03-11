/**
 * HEALO: 운영 로그 유틸리티
 * 
 * 목적:
 * - 운영자가 "왜 이 요청이 처리되지 않았는지" 추적 가능
 * - 개인정보 없이 기술적 사유만 기록
 * - 구조화된 로그로 검색/분석 용이
 * 
 * 주의:
 * - 절대 개인정보(이메일, 전화번호, 메시지 내용)를 로그에 남기지 않음
 * - IP 주소는 마지막 8자만 마스킹
 */

/**
 * 로그 레벨
 */
export type LogLevel = 'info' | 'warn' | 'error';

/**
 * 운영 이벤트 타입
 */
export type OperationalEventType =
  | 'inquiry_received'      // 문의 정상 수신
  | 'inquiry_blocked'       // 문의 차단됨
  | 'inquiry_failed'        // 문의 처리 실패
  | 'chat_received'         // 채팅 정상 수신
  | 'chat_blocked'          // 채팅 차단됨
  | 'normalize_success'     // 정규화 성공
  | 'normalize_failed'      // 정규화 실패
  | 'encryption_failed'     // 암호화 실패
  | 'rate_limit_exceeded';  // Rate limit 초과

/**
 * 운영 로그 메타데이터
 */
export interface OperationalLogMeta {
  /** 이벤트 타입 */
  event: OperationalEventType;
  /** API endpoint */
  api?: string;
  /** 클라이언트 IP (마스킹됨) */
  clientIp?: string;
  /** 차단/실패 사유 */
  reason?: string;
  /** HTTP 상태 코드 */
  statusCode?: number;
  /** 추가 컨텍스트 (개인정보 제외) */
  context?: Record<string, any>;
}

/**
 * IP 주소 마스킹 (마지막 부분만 표시)
 * 
 * 예시:
 * - 192.168.1.100 → 192.168.***.100
 * - 2001:db8::1 → 2001:db8::***::1
 */
function maskIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***,${parts[3]}`;
    }
  }
  
  // IPv6 (간단한 처리)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}::***::${parts[parts.length - 1]}`;
    }
  }
  
  // 기타: 마지막 8자만 표시
  if (ip.length > 8) {
    return '***' + ip.slice(-8);
  }
  
  return ip;
}

/**
 * ✅ 운영 안정화: 구조화된 운영 로그 기록
 * 
 * 개인정보를 제외하고 운영에 필요한 정보만 기록
 * 
 * 사용 예시:
 * ```typescript
 * logOperational('warn', {
 *   event: 'inquiry_blocked',
 *   api: '/api/inquiries/intake',
 *   clientIp: '192.168.1.100',
 *   reason: 'rate_limit_exceeded',
 *   statusCode: 429,
 *   context: { limit: 5, window: '60s' }
 * });
 * ```
 */
export function logOperational(level: LogLevel, meta: OperationalLogMeta): void {
  const timestamp = new Date().toISOString();
  const maskedIp = meta.clientIp ? maskIp(meta.clientIp) : undefined;
  
  const logEntry = {
    timestamp,
    level,
    event: meta.event,
    api: meta.api,
    clientIp: maskedIp,
    reason: meta.reason,
    statusCode: meta.statusCode,
    context: meta.context,
  };
  
  const logMessage = `[operational:${meta.event}] ${meta.reason || 'processed'}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, logEntry);
      break;
    case 'warn':
      console.warn(logMessage, logEntry);
      break;
    case 'info':
    default:
      console.log(logMessage, logEntry);
      break;
  }
  
  // TODO: 추후 구조화된 로그 시스템(Sentry, Datadog 등)으로 전송 가능
}

/**
 * ✅ 편의 함수: 문의 차단 로그
 */
export function logInquiryBlocked(
  api: string,
  clientIp: string | null,
  reason: string,
  context?: Record<string, any>
): void {
  logOperational('warn', {
    event: 'inquiry_blocked',
    api,
    clientIp: clientIp || undefined,
    reason,
    statusCode: 429,
    context,
  });
}

/**
 * ✅ 편의 함수: 문의 처리 실패 로그
 */
export function logInquiryFailed(
  api: string,
  clientIp: string | null,
  reason: string,
  context?: Record<string, any>
): void {
  logOperational('error', {
    event: 'inquiry_failed',
    api,
    clientIp: clientIp || undefined,
    reason,
    statusCode: 500,
    context,
  });
}

/**
 * ✅ 편의 함수: 문의 정상 수신 로그
 */
export function logInquiryReceived(
  api: string,
  clientIp: string | null,
  context?: Record<string, any>
): void {
  logOperational('info', {
    event: 'inquiry_received',
    api,
    clientIp: clientIp || undefined,
    statusCode: 200,
    context,
  });
}

/**
 * ✅ 편의 함수: 암호화 실패 로그
 */
export function logEncryptionFailed(
  api: string,
  clientIp: string | null,
  errorMessage: string
): void {
  logOperational('error', {
    event: 'encryption_failed',
    api,
    clientIp: clientIp || undefined,
    reason: 'encryption_error',
    statusCode: 500,
    context: { error: errorMessage },
  });
}

/**
 * ✅ 편의 함수: Rate limit 초과 로그
 */
export function logRateLimitExceeded(
  api: string,
  clientIp: string | null,
  limit: number,
  windowMs: number
): void {
  logOperational('warn', {
    event: 'rate_limit_exceeded',
    api,
    clientIp: clientIp || undefined,
    reason: `Exceeded ${limit} requests per ${windowMs / 1000}s`,
    statusCode: 429,
    context: { limit, windowMs },
  });
}
