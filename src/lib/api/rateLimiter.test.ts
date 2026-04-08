import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rateLimiter';

function mockRequest(ip: string = '127.0.0.1'): Request {
  return new Request('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
    const req = mockRequest('10.0.0.1');

    for (let i = 0; i < 5; i++) {
      expect(limiter.check(req)).toBeNull();
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    const req = mockRequest('10.0.0.2');

    limiter.check(req);
    limiter.check(req);
    limiter.check(req);

    const result = limiter.check(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it('tracks different IPs separately', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });

    const req1 = mockRequest('10.0.0.3');
    const req2 = mockRequest('10.0.0.4');

    limiter.check(req1);
    limiter.check(req1);

    // req2 should still be allowed
    expect(limiter.check(req2)).toBeNull();
    // req1 should be blocked
    expect(limiter.check(req1)).not.toBeNull();
  });

  it('returns rate limit headers', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
    const req = mockRequest('10.0.0.5');

    limiter.check(req);
    limiter.check(req);

    const headers = limiter.headers(req);
    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('8');
  });

  it('includes Retry-After on 429 response', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const req = mockRequest('10.0.0.6');

    limiter.check(req);
    const result = limiter.check(req);

    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(body.ok).toBe(false);
    expect(result!.headers.get('Retry-After')).toBeTruthy();
  });
});
