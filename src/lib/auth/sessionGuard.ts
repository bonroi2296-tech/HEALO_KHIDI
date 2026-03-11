/**
 * HEALO: 관리자 세션 만료 정책
 * 
 * 목적:
 * - 관리자 세션이 영구 유지되지 않게
 * - idle_timeout: 마지막 활동 후 N분
 * - absolute_timeout: 로그인 후 최대 N일
 * 
 * 정책:
 * - idle_timeout: 60분 (기본값)
 * - absolute_timeout: 7일 (기본값)
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * 세션 정책 설정
 */
export interface SessionPolicy {
  idleTimeoutMinutes: number;
  absoluteTimeoutDays: number;
}

/**
 * 기본 정책
 */
export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  idleTimeoutMinutes: parseInt(process.env.ADMIN_IDLE_TIMEOUT_MINUTES || "60", 10),
  absoluteTimeoutDays: parseInt(process.env.ADMIN_ABSOLUTE_TIMEOUT_DAYS || "7", 10),
};

/**
 * 세션 메타데이터
 */
interface SessionMeta {
  lastActivity: number; // timestamp (ms)
  loginTime: number; // timestamp (ms)
}

/**
 * 쿠키에서 세션 메타데이터 읽기
 */
function getSessionMeta(request: NextRequest): SessionMeta | null {
  const lastActivityStr = request.cookies.get("admin_last_activity")?.value;
  const loginTimeStr = request.cookies.get("admin_login_time")?.value;

  if (!lastActivityStr || !loginTimeStr) {
    return null;
  }

  try {
    return {
      lastActivity: parseInt(lastActivityStr, 10),
      loginTime: parseInt(loginTimeStr, 10),
    };
  } catch {
    return null;
  }
}

/**
 * 세션 메타데이터 쿠키 설정
 */
function setSessionCookies(response: NextResponse, meta: SessionMeta): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEFAULT_SESSION_POLICY.absoluteTimeoutDays * 24 * 60 * 60, // 초 단위
  };

  response.cookies.set("admin_last_activity", meta.lastActivity.toString(), cookieOptions);
  response.cookies.set("admin_login_time", meta.loginTime.toString(), cookieOptions);
}

/**
 * 세션 쿠키 삭제
 */
function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete("admin_last_activity");
  response.cookies.delete("admin_login_time");
}

/**
 * ✅ 세션 유효성 검증
 * 
 * @returns 
 *   - valid: true/false
 *   - reason: 실패 이유 (idle_timeout / absolute_timeout / no_session)
 */
export function validateSession(
  request: NextRequest,
  policy: SessionPolicy = DEFAULT_SESSION_POLICY
): {
  valid: boolean;
  reason?: "idle_timeout" | "absolute_timeout" | "no_session";
  sessionMeta?: SessionMeta;
} {
  const sessionMeta = getSessionMeta(request);

  // 세션 없음
  if (!sessionMeta) {
    return { valid: false, reason: "no_session" };
  }

  const now = Date.now();
  const idleTimeoutMs = policy.idleTimeoutMinutes * 60 * 1000;
  const absoluteTimeoutMs = policy.absoluteTimeoutDays * 24 * 60 * 60 * 1000;

  // Idle timeout 체크
  const idleElapsed = now - sessionMeta.lastActivity;
  if (idleElapsed > idleTimeoutMs) {
    console.log(
      `[SessionGuard] Idle timeout: ${Math.floor(idleElapsed / 60000)} min (limit: ${policy.idleTimeoutMinutes} min)`
    );
    return { valid: false, reason: "idle_timeout", sessionMeta };
  }

  // Absolute timeout 체크
  const absoluteElapsed = now - sessionMeta.loginTime;
  if (absoluteElapsed > absoluteTimeoutMs) {
    console.log(
      `[SessionGuard] Absolute timeout: ${Math.floor(absoluteElapsed / 86400000)} days (limit: ${policy.absoluteTimeoutDays} days)`
    );
    return { valid: false, reason: "absolute_timeout", sessionMeta };
  }

  return { valid: true, sessionMeta };
}

/**
 * ✅ 세션 갱신 (활동 시각 업데이트)
 */
export function refreshSession(request: NextRequest, response: NextResponse): void {
  const sessionMeta = getSessionMeta(request);

  if (!sessionMeta) {
    return; // 세션 없으면 갱신 안 함
  }

  // lastActivity만 업데이트
  const updatedMeta: SessionMeta = {
    ...sessionMeta,
    lastActivity: Date.now(),
  };

  setSessionCookies(response, updatedMeta);
}

/**
 * ✅ 새 세션 초기화 (로그인 시)
 */
export function initSession(response: NextResponse): void {
  const now = Date.now();
  const sessionMeta: SessionMeta = {
    lastActivity: now,
    loginTime: now,
  };

  setSessionCookies(response, sessionMeta);
  console.log("[SessionGuard] Session initialized");
}

/**
 * ✅ 세션 종료 (로그아웃 시)
 */
export function destroySession(response: NextResponse): void {
  clearSessionCookies(response);
  console.log("[SessionGuard] Session destroyed");
}

/**
 * ✅ 관리자 페이지 가드 (미들웨어 헬퍼)
 * 
 * 사용법:
 * ```ts
 * import { guardAdminPage } from '@/lib/auth/sessionGuard';
 * 
 * export function middleware(request: NextRequest) {
 *   if (request.nextUrl.pathname.startsWith('/admin')) {
 *     const guardResult = guardAdminPage(request);
 *     if (guardResult) return guardResult;
 *   }
 *   return NextResponse.next();
 * }
 * ```
 */
export function guardAdminPage(request: NextRequest): NextResponse | null {
  // ✅ Supabase 인증 상태 확인 (우선)
  // 주의: Supabase 세션이 있으면 세션 가드를 건너뛰고 통과
  const supabaseAuth = request.cookies.get("sb-access-token") || 
                       request.cookies.get("sb-refresh-token");
  
  if (supabaseAuth) {
    // Supabase 인증됨 → 세션 가드 건너뛰기
    // (Supabase 자체 세션 관리 사용)
    return null; // 통과
  }

  // Supabase 인증 없음 → 커스텀 세션 가드 적용
  const validation = validateSession(request);

  if (!validation.valid) {
    console.log(`[SessionGuard] Access denied: ${validation.reason}`);

    // 로그인 페이지로 리다이렉트
    const loginUrl = new URL("/login", request.url);
    
    // 원래 URL을 redirect 파라미터로 전달
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    
    // 만료 이유를 파라미터로 전달 (선택)
    if (validation.reason) {
      loginUrl.searchParams.set("reason", validation.reason);
    }

    const response = NextResponse.redirect(loginUrl);
    
    // 세션 쿠키 삭제
    if (validation.reason === "idle_timeout" || validation.reason === "absolute_timeout") {
      clearSessionCookies(response);
    }

    return response;
  }

  // 세션 유효 → 활동 시각 갱신
  const response = NextResponse.next();
  refreshSession(request, response);

  return response;
}

/**
 * ✅ Supabase Auth와 연동 (선택)
 * 
 * Supabase Auth를 사용 중이면 추가 검증
 */
export async function validateSupabaseSession(request: NextRequest): Promise<boolean> {
  try {
    // Supabase auth token 확인
    const authToken = request.cookies.get("sb-access-token")?.value;
    const refreshToken = request.cookies.get("sb-refresh-token")?.value;

    if (!authToken || !refreshToken) {
      return false;
    }

    // 추가 검증 (옵션)
    // - JWT 디코딩하여 만료 확인
    // - Supabase API 호출하여 토큰 유효성 확인

    return true;
  } catch (error) {
    console.error("[SessionGuard] Supabase validation error:", error);
    return false;
  }
}

/**
 * ✅ 세션 정보 조회 (디버그용)
 */
export function getSessionInfo(request: NextRequest): {
  hasSession: boolean;
  idleMinutes?: number;
  absoluteDays?: number;
  validUntil?: {
    idle: string;
    absolute: string;
  };
} {
  const sessionMeta = getSessionMeta(request);

  if (!sessionMeta) {
    return { hasSession: false };
  }

  const now = Date.now();
  const idleElapsed = now - sessionMeta.lastActivity;
  const absoluteElapsed = now - sessionMeta.loginTime;

  const policy = DEFAULT_SESSION_POLICY;
  const idleTimeoutMs = policy.idleTimeoutMinutes * 60 * 1000;
  const absoluteTimeoutMs = policy.absoluteTimeoutDays * 24 * 60 * 60 * 1000;

  return {
    hasSession: true,
    idleMinutes: Math.floor(idleElapsed / 60000),
    absoluteDays: Math.floor(absoluteElapsed / 86400000),
    validUntil: {
      idle: new Date(sessionMeta.lastActivity + idleTimeoutMs).toISOString(),
      absolute: new Date(sessionMeta.loginTime + absoluteTimeoutMs).toISOString(),
    },
  };
}
