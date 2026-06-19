/**
 * healwith: OAuth Callback Handler
 * 
 * 경로: /auth/callback
 * 권한: 공개 (OAuth 콜백)
 * 
 * 목적:
 * - Google OAuth 로그인 후 콜백 처리
 * - Supabase auth code를 세션으로 교환
 * - 성공 시 적절한 페이지로 redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  console.log("[auth/callback] 🔵 Callback route hit!");
  
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const _next = searchParams.get("next") || "/";

  console.log("[auth/callback] code:", code ? "exists" : "missing");
  console.log("[auth/callback] origin:", origin);

  if (!code) {
    console.error("[auth/callback] ❌ No code provided in callback");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  // ENV 확인
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[auth/callback] ❌ Missing Supabase ENV variables");
    return NextResponse.redirect(`${origin}/login?error=env_missing`);
  }

  console.log("[auth/callback] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  // ✅ 쿠키를 배열로 저장 (response 재생성 시 유실 방지)
  const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          console.log("[auth/callback] 📦 Storing cookies:", cookies.length);
          // 쿠키를 배열에 저장만 하고, 아직 response에는 설정하지 않음
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie);
          });
        },
      },
    }
  );

  // Code를 세션으로 교환
  try {
    console.log("[auth/callback] Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Session exchange error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    console.log(
      `[auth/callback] ✅ OAuth success: ${data.user?.email || "unknown"}`
    );

    // ✅ Admin 여부 체크 후 적절한 페이지로 redirect
    try {
      // Admin 권한 체크 — user_metadata는 클라이언트가 고칠 수 있어 신뢰 금지.
      // app_metadata.role (service_role 만 변경 가능) 또는 ADMIN_EMAIL_ALLOWLIST 만 사용.
      const user = data.user;
      const userEmail = user?.email?.trim().toLowerCase();
      let isAdmin = false;

      // 1. app_metadata.role === "admin"
      if (user?.app_metadata?.role === "admin") {
        isAdmin = true;
      }

      // 2. ADMIN_EMAIL_ALLOWLIST
      const allowlistEnv = process.env.ADMIN_EMAIL_ALLOWLIST;
      if (allowlistEnv && userEmail) {
        const allowlist = allowlistEnv
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0);

        if (allowlist.includes(userEmail)) {
          isAdmin = true;
        }
      }

      // Redirect 결정
      const redirectTo = isAdmin ? "/admin" : "/";
      console.log(
        `[auth/callback] ✅ Redirecting to ${redirectTo} (isAdmin: ${isAdmin})`
      );

      // ✅ 최종 response 생성 후 저장된 쿠키 주입
      const response = NextResponse.redirect(`${origin}${redirectTo}`);
      
      console.log("[auth/callback] 🍪 Applying stored cookies to response:", cookiesToSet.length);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
        console.log(`[auth/callback]   ✓ Set cookie: ${name}`);
      });
      
      return response;
    } catch (checkError: any) {
      console.error("[auth/callback] Admin check error:", checkError.message);
      // 에러 발생 시 안전하게 홈으로
      const response = NextResponse.redirect(`${origin}/`);
      
      // 쿠키 주입
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      
      return response;
    }
  } catch (error: any) {
    console.error("[auth/callback] Unexpected error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
