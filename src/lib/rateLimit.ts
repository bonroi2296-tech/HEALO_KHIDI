/**
 * HEALO: Rate Limit 유틸리티 (운영 안정화)
 * 
 * 목적:
 * - 봇/도배/자동화 요청으로 인한 DB 오염 방지
 * - 운영 리소스 낭비 차단
 * - 정상 사용자는 영향 없도록 보수적 설정
 * 
 * 동작 방식:
 * - IP 기반 in-memory rate limit (서버리스 환경 고려)
 * - 짧은 시간 내 과도한 요청 차단
 * - 메모리 누수 방지를 위해 자동 cleanup
 */

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
}

// IP별 요청 기록 저장 (in-memory)
const requestStore = new Map<string, RateLimitEntry>();

// 메모리 관리: 오래된 엔트리 자동 제거
const CLEANUP_INTERVAL = 60 * 1000; // 1분마다 cleanup
const ENTRY_TTL = 5 * 60 * 1000; // 5분 이상 활동 없으면 제거

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    requestStore.forEach((entry, key) => {
      if (now - entry.lastRequestAt > ENTRY_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => requestStore.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[rateLimit] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }, CLEANUP_INTERVAL);
}

// 서버 시작 시 cleanup 활성화
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
  startCleanup();
}

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  /** 시간 윈도우 (밀리초) */
  windowMs: number;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
  /** API 이름 (로그용) */
  apiName?: string;
}

/**
 * Rate Limit 결과
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blocked?: boolean;
  reason?: string;
}

/**
 * ✅ 운영 안정화: Rate Limit 체크
 * 
 * 사용 예시:
 * ```typescript
 * const result = checkRateLimit(clientIp, {
 *   windowMs: 60 * 1000, // 1분
 *   maxRequests: 10,      // 최대 10회
 *   apiName: 'inquiry'
 * });
 * 
 * if (!result.allowed) {
 *   return Response.json({ error: 'rate_limit_exceeded' }, { status: 429 });
 * }
 * ```
 * 
 * @param identifier 식별자 (IP 주소 등)
 * @param config Rate limit 설정
 * @returns Rate limit 결과
 */
export function checkRateLimit(
  identifier: string | null | undefined,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, apiName = 'api' } = config;
  
  // identifier 없으면 허용 (실패 안전)
  if (!identifier) {
    console.warn(`[rateLimit:${apiName}] No identifier provided, allowing request`);
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs };
  }
  
  const now = Date.now();
  const key = `${apiName}:${identifier}`;
  const entry = requestStore.get(key);
  
  // 첫 요청 또는 윈도우 만료
  if (!entry || now - entry.firstRequestAt > windowMs) {
    requestStore.set(key, {
      count: 1,
      firstRequestAt: now,
      lastRequestAt: now,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }
  
  // 윈도우 내 요청 수 증가
  entry.count += 1;
  entry.lastRequestAt = now;
  requestStore.set(key, entry);
  
  // Rate limit 초과 체크
  if (entry.count > maxRequests) {
    console.warn(
      `[rateLimit:${apiName}] Rate limit exceeded: ` +
      `identifier=${identifier.substring(0, 12)}..., ` +
      `count=${entry.count}/${maxRequests}, ` +
      `window=${Math.round((now - entry.firstRequestAt) / 1000)}s`
    );
    
    return {
      allowed: false,
      blocked: true,
      remaining: 0,
      resetAt: entry.firstRequestAt + windowMs,
      reason: `Too many requests. Max ${maxRequests} per ${windowMs / 1000}s.`,
    };
  }
  
  // 허용
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.firstRequestAt + windowMs,
  };
}

/**
 * 클라이언트 IP 추출 (Vercel/Cloudflare/Proxy 대응)
 * 
 * @param request Request 객체
 * @returns 클라이언트 IP 주소 또는 null
 */
export function getClientIp(request: Request): string | null {
  try {
    // Vercel: x-real-ip 또는 x-forwarded-for 헤더
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;
    
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      // x-forwarded-for: client, proxy1, proxy2
      const ips = forwarded.split(',').map(ip => ip.trim());
      return ips[0];
    }
    
    // Cloudflare
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;
    
    return null;
  } catch (error) {
    console.error('[rateLimit] Failed to extract client IP:', error);
    return null;
  }
}

/**
 * ✅ 운영 안정화: Rate Limit 응답 헤더 추가
 * 
 * 클라이언트가 rate limit 상태를 알 수 있도록 표준 헤더 추가
 * 
 * @param result Rate limit 결과
 * @returns Response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Limit': String(result.remaining + (result.blocked ? 0 : 1)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
  
  if (result.blocked) {
    headers['Retry-After'] = String(Math.ceil((result.resetAt - Date.now()) / 1000));
  }
  
  return headers;
}

/**
 * ✅ 추천 Rate Limit 설정 (보수적)
 */
export const RATE_LIMITS = {
  // 문의 제출: 1분당 5회 (정상 사용자는 충분, 봇은 차단)
  INQUIRY: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    apiName: 'inquiry',
  },
  
  // 채팅: 1분당 20회 (대화형이므로 더 허용)
  CHAT: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    apiName: 'chat',
  },
  
  // Normalize: 1분당 10회 (내부 API이지만 방어)
  NORMALIZE: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    apiName: 'normalize',
  },
  
  // Admin API: 1분당 100회 (관리자는 여러 페이지 빠르게 조회 가능)
  ADMIN: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    apiName: 'admin',
  },
} as const;
