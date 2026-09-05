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
import { LOCALES, LOCALE_COOKIE, DEFAULT_LOCALE, isLegacyLanding } from "@/lib/i18n/config";
import { resolveGuestLocale } from "@/lib/i18n/guestLinkLang";

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
  "/insurance",
  "/partners",
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
// 옛 러/카 전용 랜딩(폴더가 /ru,/kk 라 언어 prefix와 충돌)은 Yandex 색인 자산이라 이동 안 함 —
// 이 두 주소만 통과시켜 그대로 유지한다. 목록도 판정식도 i18n/config 의 isLegacyLanding 하나뿐:
// 언어 스위처(localeSwitchTarget)가 같은 함수를 쓰므로 한쪽만 고쳐지는 일이 없다(POSTMORTEMS #107).

function isPublicLocalePath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// 토큰 링크로 «계정 없이» 들어오는 화면. SEO 대상이 아니라 URL 언어화는 안 하지만,
// 방문자 본인 언어로는 보여야 한다(러/카 환자가 실제로 여는 유일한 화면들).
// ⚠️ 코디가 «로그인 없는 사람»에게 보내는 링크는 하나도 빠짐없이 여기 있어야 한다. 빠지면 그 화면만
//    조용히 영어로 열린다 — 인증도 라우팅도 멀쩡하니 아무 검사도 안 걸린다.
//    2026-08-31 추가: "/opinion/" (전문의 소견 요청, app/api/coordinator/opinions/route.ts:51).
//    실측 — Accept-Language 가 무엇이든 <html lang="en"> 이었다(같은 요청으로 /claim 은 ru/kk 정상).
//    src/lib/ga.ts:146 은 이미 네 주소를 «같은 부류»로 묶어 두고 있었다(여기만 셋이었다).
//    ※ 앞의 셋은 환자가 받지만 **/opinion 은 한국 전문의가 받는다**(카톡). 그래도 같은 칸이 맞다 —
//      이 분기가 하는 일은 「주소에 언어가 없는 로그인 없는 링크의 언어를 방문자에게서 알아내라」이지
//      「환자용이냐」가 아니다. 한국어 화면에 lang="en" 이 박히던 것도 이걸로 같이 고쳐졌다.
const GUEST_LINK_PREFIXES = ["/consultation/", "/survey/", "/claim/", "/opinion/"];
function detectLocaleWithSource(request: NextRequest) {
  // 순서·이유는 src/lib/i18n/guestLinkLang.ts 머리 주석:
  //   ①직접 고른 언어(healo_lang 쿠키) → ②링크에 실린 ?lang(보낸 사람이 아는 받는 사람 언어 — 메신저
  //   미리보기 봇은 쿠키도 Accept-Language 도 없어서 이게 유일한 단서다, 2026-09-05) → ③브라우저 언어(kk→kz) → ④en.
  return resolveGuestLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    langParam: request.nextUrl.searchParams.get("lang"),
    acceptLanguage: request.headers.get("accept-language"),
  });
}
function detectLocale(request: NextRequest) {
  return detectLocaleWithSource(request).locale;
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

    // 아래 checkSessionInMiddleware 와 같은 이유로 1회 재시도 — 인증 서버가 한 번 삐끗하면
    // 어드민이 /login 으로 튕긴다(error 면 email 도 안 채워져 «권한 없음 안내»가 아니라 로그인 벽).
    let result = await supabase.auth.getUser().catch(() => null);
    if (!result || result.error) {
      result = await supabase.auth.getUser().catch(() => null);
    }
    const user = result?.data.user;

    if (!result || result.error || !user) {
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
    // 인증 서버가 한 번 삐끗하면(느림·연결 끊김) 여기서 error 가 오는데, 그걸 그대로
    // "미로그인"으로 처리하면 **멀쩡히 로그인한 사용자가 로그인 화면으로 튕긴다.**
    // 2026-07-29 자동검사에서 실제로 1회 재현(/hospital/treatments → /login?redirect=…,
    // 재시도로 통과 · docs/KNOWN_ISSUES.md). 이 함수는 /admin·/hospital·/patient·/coordinator
    // 문 앞을 전부 지키므로 피해 범위가 넓다.
    // ponytail: 즉시 1회 재시도만 — 유예(sleep)를 넣으면 모든 보호경로에 지연이 실린다.
    //   그래도 실패하면 원래대로 미로그인 처리(보안 동일: 유효한 사용자만 통과).
    //   같은 튕김이 또 잡히면 그때 「짧은 유예 + 2회」로 올려라.
    let result = await supabase.auth.getUser().catch(() => null);
    if (!result || result.error) {
      result = await supabase.auth.getUser().catch(() => null);
    }
    return { hasSession: !!result && !result.error && !!result.data.user, response };
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
  if (isLegacyLanding(pathname)) {
    const seg = pathname.split("/")[1];        // "ru" | "kk"
    const locale = seg === "kk" ? "kz" : seg;  // URL 표준코드(kk) → 내부코드(kz)
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    headers.set("x-pathname", pathname);
    const res = NextResponse.next({ request: { headers } });
    // 서버는 x-locale(=initialLang)로 ru/kz 렌더하는데 클라 getLangCodeFromCookie 가
    // healo_lang 쿠키를 못 읽으면 en 으로 갈려 hydration mismatch (POSTMORTEMS #77).
    // 아래 일반 로케일 분기(res.cookies.set(LOCALE_COOKIE, seg …))와 동일하게 쿠키를 맞춘다.
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000 });
    return res;
  }

  // ========================================
  // 초대 링크(게스트) — 주소에 언어가 없고 쿠키도 없는 «첫 방문 외국인 환자» 구제
  // ========================================
  // 문제: 상담방·설문은 SEO 무관이라 URL 언어화(PUBLIC_PREFIXES) 대상이 아니다 → x-locale 이
  //   안 붙는다. #1047 이 「x-locale 없으면 쿠키 언어」까지는 열어 뒀지만, **초대 링크로 처음
  //   오는 환자는 쿠키도 없다** → app/layout.jsx 의 마지막 폴백 "en" 으로 떨어졌다.
  //   실측(2026-07-27 프로덕션): /consultation/… 은 Accept-Language 가 ru·kk·ko 무엇이든
  //   전부 <html lang="en"> (같은 요청으로 /telemedicine 은 ru·kk 로 정상). 러/카 환자가
  //   상담방·만족도설문을 영어로 받고 있었다 = 핵심 타겟이 새는 지점.
  // 고침: 이 경로들도 detectLocale(쿠키 → Accept-Language(kk→kz) → en)을 태운다.
  //   감지 장치는 이미 있었고 잘 돈다 — 이 경로만 그 분기를 안 탔을 뿐이다.
  // ⚠️ 인증 로직엔 영향 없다: 이 경로들은 원래 아래 분기를 하나도 안 타고
  //   맨 끝 NextResponse.next() 로 떨어진다(초대토큰 검증은 페이지·API 가 한다).
  //   /opinion 을 넣을 때 다시 확인함(2026-08-31): 아래 인증 분기는 /admin·/hospital·/patient·
  //   /agency·/clinic·/coordinator 여섯뿐이고 /opinion 은 어디에도 안 걸린다 — 즉 이 줄에 넣어도
  //   «있던 검사가 사라지는» 일이 없다. 새 주소를 넣기 전에 이 대조를 반드시 다시 하라.
  // 🔸 남은 한계(2026-08-31 실측): 메신저 미리보기 «봇»은 쿠키도 Accept-Language 도 안 보낸다
  //   → 카드가 영어로 뜬다. 환자가 실제로 열면 Accept-Language 로 제 언어가 나온다(사람은 정상).
  //   봇까지 맞추려면 링크에 ?lang= 를 붙여야 한다 → docs/KNOWN_ISSUES.md 참고.
  if (GUEST_LINK_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { locale, source } = detectLocaleWithSource(request);
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    const res = NextResponse.next({ request: { headers } });
    // 불변식(POSTMORTEMS #77): x-locale 을 주입하는 분기는 healo_lang 쿠키도 같이 심는다.
    // 안 그러면 서버는 ru 로 그리고 클라는 쿠키가 없어 en 으로 갈려 hydration mismatch.
    // ⚠️ 링크의 ?lang 에서 온 언어는 «세션 동안만»(maxAge 없음) — 쿠키 없는 직원이 환자 링크를 눌렀다고
    //    1년짜리 쿠키로 화면이 그 언어에 묶이면 안 된다(독립 리뷰 2026-09-05). 환자는 다음에도 같은 링크로 온다.
    res.cookies.set(LOCALE_COOKIE, locale, source === "param" ? { path: "/" } : { path: "/", maxAge: 31536000 });
    return res;
  }

  // ========================================
  // URL 언어화 (공개 마케팅 경로만) — 인증 로직보다 먼저
  // ========================================
  if (!isLegacyLanding(pathname)) {
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

    // 언어 접두어는 있는데 공개 경로가 아니다(/ru/없는-주소 = 오타·죽은 링크 → 404).
    // 주소가 말하는 언어로 404 를 그린다. 2026-09-06 로컬 실측: 쿠키 없는 첫 방문(공유된 옛 링크·검색 결과)은
    // x-locale 도 쿠키도 없어 app/layout 의 마지막 폴백 en 으로 떨어져 러시아어 방문자가 「Page not found」를 봤다.
    // 이 분기 아래엔 언어 접두어가 붙은 실제 경로가 없다(포털·인증 경로는 접두어 없이 산다) — 즉 여기 오면 전부 404 다.
    // 쿠키는 안 심는다: 깨진 링크 하나로 방문자의 언어 설정을 바꾸면 안 된다.
    if (hasLocale) {
      const headers = new Headers(request.headers);
      headers.set("x-locale", seg);
      return NextResponse.next({ request: { headers } });
    }
    // 공개 언어화 대상 아님 → 아래 기존 인증 로직으로 (원래 pathname 사용)
  }

  // ========================================
  // 로그인 벽 — «처음 오는» 방문자도 제 언어로 (2026-08-31)
  // ========================================
  // 왜 필요한가 (실측): `/patient/*` 는 전부 로그인 뒤라 코디가 보낸 딥링크를 누른 환자는
  //   307 로 `/login` 에 도착한다. 그런데 `/login` 은 PUBLIC_PREFIXES 에도 GUEST_LINK_PREFIXES
  //   에도 없어서 x-locale 이 안 붙고, getUiLocale 의 폴백은 «쿠키뿐»이라 **쿠키가 없는 첫
  //   방문자는 통째로 영어**를 받았다 — Accept-Language 가 ru 든 kk 든 <html lang="en">.
  //   즉 「두 번째 방문부터만 러시아어」였고, 초대 링크로 처음 오는 환자가 정확히 그 반대다.
  //   (2026-08-31 실측: Accept-Language: ru 로 /patient/visa → /login 도착 → "Sign in | healwith")
  //
  // ⚠️ 왜 getUiLocale 에 Accept-Language 를 넣지 «않았나» — 그게 더 짧아 보이지만 틀린다.
  //   서버 컴포넌트는 쿠키를 심을 수 없다. 서버만 Accept-Language 로 ru 를 그리면 클라이언트는
  //   쿠키가 없어 en 으로 갈려 **hydration mismatch**(POSTMORTEMS #77)가 그대로 재현된다.
  //   그래서 «쿠키를 심을 수 있는 유일한 자리»인 여기서 고친다 — 위 게스트 분기와 같은 방식이다.
  //
  // ⚠️ 여기 목록은 «인증 검사를 원래 안 타는» 화면만이어야 한다. 아래 인증 분기(/admin·/patient·
  //   /hospital·/agency·/clinic·/coordinator)에 걸리는 경로를 넣으면 그 분기를 건너뛰어
  //   **검사가 사라진다.** 넣기 전에 반드시 아래 분기 목록과 대조하라.
  //   `/patient/*` 를 여기 넣지 않은 이유도 그것이고, 넣을 필요도 없다 — 환자는 `/login` 을
  //   반드시 거치고 거기서 쿠키가 심어지므로 그다음 화면부터는 쿠키가 이어 준다.
  //   `/auth/confirm` 만 넣고 `/auth/callback` 은 안 넣는다(OAuth 콜백은 손대지 않는다).
  const VISITOR_LANG_PREFIXES = [
    "/login",
    "/signup",
    "/find-id",
    "/forgot-password",
    "/reset-password",
    "/auth/confirm",
    "/account/password",
    "/no-access",
    "/app",
    "/notifications",
  ];
  if (VISITOR_LANG_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const locale = detectLocale(request);
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    const res = NextResponse.next({ request: { headers } });
    // 불변식(POSTMORTEMS #77): x-locale 을 주입하는 분기는 healo_lang 쿠키도 같이 심는다.
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000 });
    return res;
  }

  // ========================================
  // 예외 경로: 인증 없이 통과
  // ========================================
  // ⚠️ /login·/signup 은 위 VISITOR_LANG_PREFIXES 가 «먼저» 잡아 같은 next() 를 돌려준다
  //    (언어만 얹어서). 여기 남겨 두는 건 목록이 갈라졌을 때의 안전벨트다.
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
  // ⚠️ 308(영구)을 쓴다. 옛 주석은 "로그인 벽 안이라 SEO 무관 → 임시(307)"라고 했으나
  //    2026-07-21 실측으로 **둘 다 거짓**임이 드러났다(반성문 #104):
  //    ①이 분기는 아래 /hospital 인증 체크(L299)보다 먼저 실행돼 미로그인·구글봇도 그냥 307을 받는다
  //      (= 로그인 벽 밖). ②/partner 는 app/robots.js Disallow 목록에 아예 없다(/hospital·/doctor만 있음).
  //    임시 리다이렉트는 구글이 옛 URL을 색인에 붙들어 두는 신호라, 영구 폐기엔 308이 맞다.
  // ========================================
  // /partner/* → /hospital/* (국내 병원 포털 리네임, 의사 흡수) — 영구 리네임
  if (pathname === "/partner" || pathname.startsWith("/partner/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/hospital" + pathname.slice("/partner".length);
    return NextResponse.redirect(url, 308);
  }
  // /doctor/* → 비활성화 (의사는 별도 포털 없이 상담방 초대링크 참여자). 홈으로. 영구 폐지(#334).
  // 단, /doctor 는 robots.js Disallow 대상이라 구글이 크롤 자체를 안 한다 → 이 308을 못 본다.
  // (Disallow 는 색인 제거가 아니라 오히려 URL-only 항목을 남긴다. 실제로 색인에 뜨면
  //  robots 에서 /doctor 를 풀어 308 을 보게 하는 게 제거 경로 — 지금은 노출 근거가 없어 보류.)
  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
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
      // 로그인은 됐는데 권한만 없는 계정(email 있음)을 /login 으로 되던지면
      // "로그인했는데 또 로그인?" 무한 루프처럼 보인다(2026-07-06 PO 실사고).
      // → 사유·갈 곳을 알려주는 안내 페이지로 보낸다. 미로그인만 /login.
      if (email) {
        const deniedUrl = new URL("/no-access", request.url);
        deniedUrl.searchParams.set("area", "admin");
        deniedUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(deniedUrl);
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
  // /agency · /clinic 경로 보호 (로그인 여부 체크, 세부 권한은 API 가 checkAgencyAuth 로)
  // ========================================
  // 2026-08-25: 다섯 포털 중 여기만 서버 단계 확인이 «아예 없었다». 자료가 새는 건 아니지만
  //   (조회 창구가 checkAgencyAuth 로 막는다) 미로그인 파트너가 로그인 화면으로 안 가고
  //   화면 안에서 「로그인이 필요합니다」만 보고 멈췄다 — 나머지 넷과 동작이 달랐다.
  //   ⚠️ 「기능이 없다」가 아니라 「길안내가 없었다」는 뜻이다. 판정은 여전히 API 가 한다.
  if (pathname.startsWith("/agency") || pathname.startsWith("/clinic")) {
    const { hasSession, response: partnerPortalResponse } = await checkSessionInMiddleware(request);
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return partnerPortalResponse;
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
