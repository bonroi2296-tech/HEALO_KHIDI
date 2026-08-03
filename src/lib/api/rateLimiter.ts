/**
 * In-memory rate limiter for API routes.
 * Uses sliding window approach per IP address.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
 *   // In route handler:
 *   const limited = limiter.check(request);
 *   if (limited) return limited; // Returns 429 Response
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs?: number;
  /** Max requests per window */
  max?: number;
  /** Custom message */
  message?: string;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RequestRecord>>();

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const { windowMs = 60_000, max = 60, message = 'Too many requests' } = options;

  // Each limiter gets its own store
  const id = Math.random().toString(36).slice(2);
  const store = new Map<string, RequestRecord>();
  stores.set(id, store);

  // Cleanup expired entries every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of store) {
        if (record.resetAt <= now) store.delete(key);
      }
    }, 5 * 60_000);
  }

  return {
    /**
     * Check if request should be rate limited.
     * Returns null if allowed, or a 429 Response if limited.
     */
    check(request: Request): Response | null {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

      const now = Date.now();
      let record = store.get(ip);

      if (!record || record.resetAt <= now) {
        record = { count: 1, resetAt: now + windowMs };
        store.set(ip, record);
      } else {
        record.count++;
      }

      const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

      if (record.count > max) {
        return new Response(
          JSON.stringify({ ok: false, error: message }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': String(max),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(record.resetAt),
              'Retry-After': String(resetSeconds),
            },
          },
        );
      }

      return null; // Allowed
    },

    /** Get rate limit headers for successful responses */
    headers(request: Request): Record<string, string> {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const record = store.get(ip);
      const remaining = record ? Math.max(0, max - record.count) : max;

      return {
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': String(remaining),
      };
    },
  };
}

/** Default rate limiter: 60 req/min */
export const defaultLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

/** Strict rate limiter for auth routes: 10 req/min */
export const authLimiter = createRateLimiter({ windowMs: 60_000, max: 10, message: 'Too many auth attempts' });

/** Upload rate limiter: 10 req/5min */
// 파일 1개당 2회 호출(서명 발급 + 업로드 후 검증)이라 20 = 실질 「5분에 파일 10개」.
// 2026-08-03 직행 업로드 전환 때 10 → 20. 안 올렸으면 파일 6개째부터 막혔다(전환 전과 동일한 체감 유지).
export const uploadLimiter = createRateLimiter({ windowMs: 5 * 60_000, max: 20, message: 'Upload rate limit exceeded' });
