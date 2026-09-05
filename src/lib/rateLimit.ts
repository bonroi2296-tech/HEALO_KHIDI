/**
 * healwith: Rate Limit 유틸리티 (운영 안정화)
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
  
  // identifier 없으면 차단 (Fail-Closed)
  if (!identifier) {
    console.warn(`[rateLimit:${apiName}] No identifier provided, blocking request`);
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
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
 * ✅ Persistent rate limit — Supabase RPC 기반 (cross-isolate)
 *
 * Vercel serverless 에서 isolate 마다 메모리가 독립이라 같은 IP 가 다른 isolate 히트하면
 * in-memory 카운터가 리셋됨. 진짜 공격자 차단 효과가 떨어짐.
 * DB 기반 sliding window 로 교체.
 *
 * 동작:
 * - `check_rate_limit(key, window_ms, max_requests)` RPC 호출
 * - 반환: { allowed, remaining, reset_at }
 * - DB 실패 시 → in-memory 로 fallback (fail-open 방지)
 *
 * 사용:
 * ```ts
 * const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
 * if (!rl.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 });
 * ```
 */
export async function checkRateLimitPersistent(
  identifier: string | null | undefined,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, apiName = "api" } = config;

  if (!identifier) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }

  // 🛑 통 이름에 «검사 실행 번호»를 끼운다 — 실서비스에선 이 변수가 없어 한 글자도 안 달라진다.
  //
  // 왜 필요한가 (2026-08-31 실측으로 확정):
  //   러너에서 도는 서버는 localhost 라 `getClientIp` 가 «항상 ::1» 이다(같은 실행 로그의
  //   ai_guard 줄에 그 값이 그대로 찍힌다). 그리고 이 통은 «검사 전용 Supabase» 한 곳에 들어간다.
  //   → 즉 **PR 두 개의 E2E 가 겹쳐 돌면 두 실행이 통 하나를 나눠 쓴다.**
  //   의뢰서 접수(INQUIRY)는 1분에 5회인데 스모크 한 번이 이미 4회를 쓴다. 겹치는 순간
  //   뒤에 온 요청이 429 를 맞고 화면은 접수 실패로 멈춘다. 서버는 429 를 로그로 안 남기고
  //   시험은 「#track-url 을 못 찾음」이라고만 말해서, 이게 «내 코드 탓»처럼 보인다.
  //   (2026-08-31 06:56 실측: 27초 차이로 올라간 PR 두 개가 같은 분에 8회를 밀어 넣었고
  //    내 쪽 3회가 연달아 죽었다. 상대 쪽도 1회 죽었는데 재시도로 가려져 아무도 못 봤다.)
  //   같은 이유로 aiGuard 의 «IP 하루 400회» 자동차단이 검사 DB 에 날마다 쌓여 있었다.
  //
  // ⚠️ 요청 헤더가 아니라 «서버 환경변수»로만 갈린다 — 손님이 헤더를 지어내 통을 갈아탈 수 없다.
  //    IP 는 그대로 열쇠에 남으므로, 혹시 실서비스에 이 변수가 켜져도 IP별 제한은 그대로다
  //    (통이 한 번 비워질 뿐 느슨해지지 않는다).
  // ⚠️ 위 in-memory 판(112줄)에는 안 넣는다 — 그건 프로세스마다 따로라 애초에 안 섞인다.
  const testNamespace = process.env.RATE_LIMIT_NAMESPACE;
  const key = testNamespace
    ? `${apiName}:${testNamespace}:${identifier}`
    : `${apiName}:${identifier}`;

  try {
    const { supabaseAdmin } = await import("./rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any).rpc("check_rate_limit", {
      p_key: key,
      p_window_ms: windowMs,
      p_max_requests: maxRequests,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // DB 호출 실패 → in-memory 로 fallback (fail-open 하지 않음)
      console.warn(`[rateLimit:${apiName}] DB RPC failed, falling back to in-memory: ${error?.message}`);
      return checkRateLimit(identifier, config);
    }

    const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
    return {
      allowed: row.allowed,
      remaining: row.remaining,
      resetAt: new Date(row.reset_at).getTime(),
      blocked: !row.allowed,
      reason: !row.allowed ? `Too many requests. Max ${maxRequests} per ${windowMs / 1000}s.` : undefined,
    };
  } catch (e) {
    console.warn(`[rateLimit:${apiName}] Exception during DB RPC, fallback:`, (e as Error).message);
    return checkRateLimit(identifier, config);
  }
}

/**
 * ✅ 추천 Rate Limit 설정 (보수적)
 */
export const RATE_LIMITS = {
  // 문의 제출: 1분당 5회 (정상 사용자는 충분, 봇은 차단)
  //
  // ⚠️ 통(apiName)이 같으면 «여러 라우트가 한 통에 합산»된다 — 키가 `apiName:IP` 라서다.
  // 인메모리 시절엔 인스턴스마다 흩어져 잘 안 걸렸는데, DB 판으로 옮기면 정확히 합산돼
  // 정상 사용자가 막힐 수 있다. 성격이 다른 흐름(제출 vs 화면 열기)은 통을 나눠라.
  // 의뢰서 «서류 판독»(/api/inquiry/classify-doc) — 서류 1개당 1회. 🛑 INQUIRY(접수, 5/분)와 통을 «같이 쓰지 마라».
  //    2026-08-19 독립 리뷰: 같은 통을 쓰고 있어서 폼이 권하는 서류 5개를 올리면 판독 5회가 접수 한도를 다 먹고
  //    정작 「보내기」가 429 를 맞았다. 업로드 서명 통(20/분)과 같은 크기.
  DOC_CLASSIFY: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    apiName: 'doc_classify',
    message: 'Too many document reads. Please wait a minute.',
  },
  INQUIRY: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    apiName: 'inquiry',
  },

  // 채팅 화면 «열기»(대화방 목록·복구·요약) 전용 통 — 2026-08-13 신설.
  // 왜 나눴나: 이 3개는 화면 한 번 열 때 함께 불린다. 제출용 5회 통에 얹으면
  // 문의 폼을 내고(3회) 채팅을 여는 것만으로 상한을 넘긴다(실측 6회 > 5회).
  // 30회로 잡아도 토큰 추측 방어는 그대로다 — 1분에 30번 찍어서 맞힐 수 있는 토큰이 아니다.
  CHAT_READ: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    apiName: 'chat_read',
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
