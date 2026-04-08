/**
 * HEALO: Next.js Middleware (서버 레벨 보호)
 * 
 * 목적:
 * - /admin 경로를 서버 레벨에서 보호
 * - Admin 권한이 없으면 /login으로 redirect
 * - Client-side 체크 전에 실행되어 UI 노출 차단
 * 
 * 실행 순서:
 * 1. Middleware (서버) ← 여기서 먼저 차단
 * 2. Server Component
 * 3. Client Component
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * ✅ Middleware에서 admin 권한 체크
 * 
 * 판정 기준:
 * 1. user.user_metadata.role === "admin"
 * 2. user.app_metadata.role === "admin"
 * 3. ADMIN_EMAIL_ALLOWLIST에 포함된 이메일
 *
 * ⚠️ isAdmin일 때 반드시 반환된 response를 사용해야 함.
 * Supabase가 세션 갱신 시 setAll로 쿠키를 넣은 response를 그대로 돌려줘야
 * Vercel 등에서 쿠키가 브라우저에 전달되어 다음 요청에서 로그인 유지됨.
 */
async function checkAdminInMiddleware(request: NextRequest): Promise<{
  isAdmin: boolean;
  email?: string;
  response: NextResponse;
}> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { isAdmin: false, response };
    }

    const userEmail = user.email?.trim().toLowerCase();

    if (user.user_metadata?.role === "admin") {
      return { isAdmin: true, email: userEmail, response };
    }
    if (user.app_metadata?.role === "admin") {
      return { isAdmin: true, email: userEmail, response };
    }

    const allowlistEnv = process.env.ADMIN_EMAIL_ALLOWLIST;
    if (allowlistEnv && userEmail) {
      const allowlist = allowlistEnv
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);
      if (allowlist.includes(userEmail)) {
        return { isAdmin: true, email: userEmail, response };
      }
    }

    return { isAdmin: false, email: userEmail, response };
  } catch (error: any) {
    console.error("[middleware] Admin check error:", error.message);
    return { isAdmin: false, response };
  }
}

/**
 * ✅ /partner 경로용: 로그인 세션 존재 여부만 체크
 * 통과 시 쿠키가 담긴 response를 반환해 세션 유지.
 */
async function checkSessionInMiddleware(request: NextRequest): Promise<{
  hasSession: boolean;
  response: NextResponse;
}> {
  let response = NextResponse.next({ request: { headers: request.headers } });
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    return { hasSession: !error && !!user, response };
  } catch {
    return { hasSession: false, response };
  }
}

/**
 * ✅ Middleware 실행
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========================================
  // 예외 경로: 인증 없이 통과
  // ========================================
  const publicPaths = [
    "/login",
    "/signup",
    "/auth/callback", // ⚠️ OAuth 콜백 예외 처리 (필수)
    "/api",
  ];

  // 예외 경로는 middleware 건너뛰기
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ========================================
  // /admin 경로 보호 (서버 레벨)
  // ========================================
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/whoami") {
      return NextResponse.next();
    }

    const { isAdmin, email, response: adminResponse } = await checkAdminInMiddleware(request);

    if (!isAdmin) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[middleware] Admin access blocked: ${pathname} | ${email || "none"}`);
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // ✅ 쿠키가 담긴 response 반환 (세션 갱신 쿠키가 브라우저에 전달됨)
    return adminResponse;
  }

  // ========================================
  // /partner 경로 보호 (로그인 여부만 체크, 세부 권한은 GateClient에서)
  // ========================================
  if (pathname.startsWith("/partner")) {
    const { hasSession, response: partnerResponse } = await checkSessionInMiddleware(request);
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return partnerResponse;
  }

  // ========================================
  // /patient 경로 보호 (로그인 여부 체크)
  // ========================================
  if (pathname.startsWith("/patient")) {
    const { hasSession, response: patientResponse } = await checkSessionInMiddleware(request);
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return patientResponse;
  }

  return NextResponse.next();
}

/**
 * ✅ Middleware 적용 경로
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
