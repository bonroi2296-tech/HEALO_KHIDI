/**
 * HEALO: Next.js Proxy (구 middleware — 서버 레벨 보호)
 *
 * ⚠️ Next.js 16 부터 `middleware.ts` 는 deprecated.
 *   `proxy.ts` + `export async function proxy` 로 마이그레이트됨.
 *   https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * 목적:
 * - /admin 경로를 서버 레벨에서 보호
 * - Admin 권한이 없으면 /login 으로 redirect
 * - Client-side 체크 전에 실행되어 UI 노출 차단
 *
 * 실행 순서:
 * 1. Proxy (서버) ← 여기서 먼저 차단
 * 2. Server Component
 * 3. Client Component
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALES, LOCALE_COOKIE, DEFAULT_LOCALE } from "@/lib/i18n/config";

// ── URL 언어화(locale-in-path) ──────────────────────────────
// 공개 마케팅 경로만 /{locale}/ 로 강제. /ru/treatments → 내부 /treatments rewrite + x-locale 헤더로 언어 전달.
// 내부도구(admin/patient/coordinator/partner/agency)·auth·게스트(consultation/survey)는 제외(SEO 무관·Korean UI).
// ponytail: 공개경로 단일 목록. 새 공개페이지 추가 시 여기 한 줄. (phase 5에서 app 폴더 자동발견으로 대체 예정)
const PUBLIC_PREFIXES = [
  "/",                    // 홈 (정확히 "/" 만 매칭)
  "/treatments",
  "/hospitals",
  "/telemedicine",
  "/care-journey",
  "/cost-calculator",
  "/search",
  "/specialties",
  "/faq",
  "/education",
  "/visa",
  "/about",
  "/contact",
  "/inquiry",
  "/success",
  "/stories",
  "/terms",
  "/privacy",
  "/cookies",
  "/medical-disclaimer",
];
// 옛 러/카 전용 랜딩(폴더가 /ru,/kk 라 언어 prefix와 충돌). Yandex 색인 자산이라 이동 안 함 — 이 두 주소만 통과시켜 그대로 유지.
const LEGACY_SKIP = ["/ru/for-russian-patients", "/kk/for-kazakh-patients"];

function isPublicLocalePath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function detectLocale(request: NextRequest) {
  // 직접 고른 언어(healo_lang 쿠키)는 항상 우선 — 다음 방문에도 유지.
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && LOCALES.includes(cookie)) return cookie;
  // 2) 첫 진입 = 브라우저/시스템 언어가 우리 6개 중 하나면 그걸로(한→ko, 카→kz, 일→ja…).
  let want = (request.headers.get("accept-language") || "").split(",")[0].split("-")[0].toLowerCase();
  if (want === "kk") want = "kz"; // 카자흐어 ISO코드(kk) → 내부코드(kz). 안 맞추면 1순위 타겟이 영어로 샘.
  if (LOCALES.includes(want)) return want;
  // 3) 우리에 없는 언어면 영어(DEFAULT_LOCALE). PO 지정.
  return DEFAULT_LOCALE;
}

/**
 * ✅ Middleware에서 admin 권한 체크
 *
 * 판정 기준 (OR):
 * 1. user.app_metadata.role === "admin"   ← service_role만 쓸 수 있는 필드
 * 2. ADMIN_EMAIL_ALLOWLIST에 포함된 이메일
 *
 * ⚠️ user_metadata는 클라이언트(auth.updateUser) 로 자기 자신이 고칠 수 있으므로
 * 어드민 판정에 절대 사용 금지. 과거 코드가 체크하던 경로를 삭제했음.
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

    // Only trust app_metadata (server-writable). user_metadata is client-writable
    // via auth.updateUser() and must NEVER be used for authorization decisions.
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
    console.error("[proxy] Admin check error:", error.message);
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
 * ✅ Proxy 실행 (구 middleware)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========================================
  // 옛 러/카 전용 랜딩 — 주소·폴더는 그대로(Yandex 색인 자산)지만
  // x-locale 만 박아 <html lang>이 en 이 아니라 실제 언어(ru/kk)로 렌더되게(SEO).
  // ========================================
  const legacy = LEGACY_SKIP.find((p) => pathname.startsWith(p));
  if (legacy) {
    const seg = pathname.split("/")[1];        // "ru" | "kk"
    const locale = seg === "kk" ? "kz" : seg;  // URL 표준코드(kk) → 내부코드(kz)
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  // ========================================
  // URL 언어화 (공개 마케팅 경로만) — 인증 로직보다 먼저
  // ========================================
  if (!LEGACY_SKIP.some((p) => pathname.startsWith(p))) {
    const seg = pathname.split("/")[1];
    const hasLocale = LOCALES.includes(seg);
    const bare = hasLocale ? pathname.slice(seg.length + 1) || "/" : pathname;

    if (isPublicLocalePath(bare)) {
      if (hasLocale) {
        // /ru/treatments → 내부 /treatments 로 rewrite, 언어는 x-locale 헤더 + 쿠키로 전달(주소는 유지)
        const url = request.nextUrl.clone();
        url.pathname = bare;
        const headers = new Headers(request.headers);
        headers.set("x-locale", seg);
        headers.set("x-pathname", bare); // hreflang/canonical 생성용(언어 뗀 경로)
        const res = NextResponse.rewrite(url, { request: { headers } });
        res.cookies.set(LOCALE_COOKIE, seg, { path: "/", maxAge: 31536000 });
        return res;
      }
      // prefix 없는 공개경로 → 감지 언어로 308 redirect
      const url = request.nextUrl.clone();
      url.pathname = `/${detectLocale(request)}${pathname}`;
      return NextResponse.redirect(url, 308);
    }
    // 공개 언어화 대상 아님 → 아래 기존 인증 로직으로 (원래 pathname 사용)
  }

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
  // 레거시 경로 리다이렉트 (계층 재편 — 옛 링크/북마크 안 깨지게)
  // 로그인 벽 안이라 SEO 무관 → 되돌리기 쉽게 임시(307) redirect.
  // ========================================
  // /partner/* → /hospital/* (국내 병원 포털 리네임, 의사 흡수)
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/hospital" + pathname.slice("/partner".length);
    return NextResponse.redirect(url);
  }
  // /doctor/* → 비활성화 (의사는 별도 포털 없이 상담방 초대링크 참여자). 홈으로.
  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
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
        console.warn(`[proxy] Admin access blocked: ${pathname} | ${email || "none"}`);
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // ✅ 쿠키가 담긴 response 반환 (세션 갱신 쿠키가 브라우저에 전달됨)
    return adminResponse;
  }

  // ========================================
  // /hospital 경로 보호 (로그인 여부만 체크, 세부 권한은 GateClient에서)
  // ========================================
  if (pathname.startsWith("/hospital")) {
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

  // ========================================
  // /coordinator 경로 보호 (로그인 여부 체크, 세부 권한은 페이지에서)
  // ========================================
  if (pathname.startsWith("/coordinator")) {
    const { hasSession, response: coordinatorResponse } = await checkSessionInMiddleware(request);
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return coordinatorResponse;
  }

  return NextResponse.next();
}

/**
 * ✅ Proxy 적용 경로
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
