"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LogOut, Globe, ChevronDown, Check } from "lucide-react";
// ⚠️ Supabase 클라이언트를 여기서 static import 하면 안 된다 — ClientShell 은 전 페이지를 감싸서
// 공개 홈에도 supabase-vendor(43KB gz)가 첫 화면 번들로 딸려오고, 히어로 이미지와 대역폭을 다툰다
// (2026-07-27 PageSpeed: 그중 34.5KB 는 홈에서 아예 안 쓰는 코드). 아래 loadSupabase() 로
// 마운트 뒤에 불러온다 = 로그인 확인은 그대로, 첫 화면 경로에서만 빠짐.
const loadSupabase = () => import("@/lib/data/supabaseClient").then((m) => m.supabaseClient);
import { SITE_INFO } from "@/lib/siteSettings";
import { getLangCodeFromCookie, setLangCookie, setBackofficeLangCookie, LANG_OPTIONS_PRIMARY, t } from "@/lib/i18n";
import { LangProvider, useLang } from "@/lib/i18n/LangContext";
import {
  Header,
  MobileBottomNav,
  FloatingInquiryBtn,
} from "@/components.jsx";
import Logo from "../components/brand/Logo";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useToast } from "@/components/Toast";
import CookieConsent from "@/components/CookieConsent";
// 알림 종은 로그인한 사람에게만 보인다 → 공개 홈 방문자는 받을 이유가 없다(같은 이유로 지연 로드).
const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { ssr: false });
import { pageview, hasAnalyticsConsent, setAnalyticsUser, initDebugMode, event, GA_EVENTS } from "@/lib/ga";
import { captureArrival } from "@/lib/inquiry/arrival";

export default function ClientShell({ children, initialLang = "en" }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  // useSearchParams 제거: 자동 새로고침 문제 해결
  // const searchParams = useSearchParams();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [isHospitalUser, setIsHospitalUser] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [siteConfig, setSiteConfig] = useState({ logo: "", hero: "" });

  useEffect(() => {
    
    let mounted = true;

    const checkHospitalUser = (accessToken) => {
      if (!accessToken) { setIsHospitalUser(false); return; }
      fetch("/api/partner/whoami", {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => { if (mounted) setIsHospitalUser(!!d.isHospitalUser); })
        .catch(() => { if (mounted) setIsHospitalUser(false); });
    };

    // 구독 해제 함수는 supabase 가 늦게 도착하므로 ref 대신 지역 변수에 담아 정리 시점에 호출한다.
    let unsubscribe = null;

    loadSupabase().then((supabaseClient) => {
      if (!mounted) return;

      supabaseClient.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (mounted) {
            setSession(session);
            checkHospitalUser(session?.access_token);
          }
        });

      const { data } = supabaseClient.auth.onAuthStateChange(
        (_event, session) => {
          if (mounted) {
            setSession(session);
            checkHospitalUser(session?.access_token);
          }
        }
      );
      unsubscribe = () => data?.subscription?.unsubscribe();

      supabaseClient
        .from("site_settings")
        .select("logo_url,hero_background_url")
        .single()
        .then(({ data }) => {
          if (mounted && data) {
            setSiteConfig({ logo: data.logo_url, hero: data.hero_background_url });
          }
        })
        .catch(() => { /* RLS/테이블 없음 시 무시, 기본 UI 유지 */ });
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 네이티브 앱(Capacitor)에서만 푸시 알림 등록. 웹 브라우저면 즉시 no-op(동적 import라 번들 무영향).
  useEffect(() => {
    import("@/lib/push/registerPush")
      .then((m) => m.registerPushNotifications())
      .catch(() => { /* 네이티브 아님/플러그인 없음 → 무시 */ });
  }, []);

  // 스토어 앱: 웹이 실제로 그려진 순간 시작화면을 걷는다(저속 회선에서 흰 화면 방지).
  // 설정에도 3초 안전망(launchAutoHide)이 있어, 이게 안 돌아도 앱이 갇히지 않는다.
  useEffect(() => {
    import("@/lib/app/hideSplash")
      .then((m) => m.hideSplashWhenReady())
      .catch(() => { /* 네이티브 아님 → 무시 */ });
  }, []);

  // 라우트 변경 시 GA4 pageview 1회 발화 (자동 새로고침 원인이던 useSearchParams는 위에서 제거됨 —
  // pathname-only 이펙트는 네비게이션을 유발하지 않아 안전). 동의("all")가 있고 gtag 존재할 때만.
  // ga.ts의 pageview()가 window.gtag 없으면 no-op이라 이중 안전.
  const lastPageviewRef = useRef("");
  useEffect(() => {
    if (lastPageviewRef.current === pathname) return; // 중복 발화 가드
    if (!hasAnalyticsConsent()) return; // 동의 게이트 (GA 로드 게이트와 일관)
    lastPageviewRef.current = pathname;
    pageview(pathname);
  }, [pathname]);

  // 첫 진입 유입 기록 — «어디서 들어왔나」는 사이트 안에서 한 번이라도 이동하면 사라진다
  // (referrer 가 우리 도메인으로 바뀜) → 도착한 순간 세션에 잡아 두고 문의 제출 때 동봉한다.
  // GA 동의와 별개: 저장소에 세션 한정으로만 두고, DB 기록은 PIPA 동의를 받은 문의 제출 때만.
  useEffect(() => { captureArrival(); }, []);

  // GA4 「DebugView」 스위치 — 주소에 ?ga_debug=1 을 붙여 연 탭에서만 켜진다(일반 방문자엔 영향 없음).
  // 분석은 «틀려도 화면이 멀쩡»해서 눈으로 검증할 방법이 없다 → 실서비스에서 직접 확인하는 통로.
  useEffect(() => { initDebugMode(); }, []);

  // 로그인 상태를 GA 에 반영: ①직원(운영자·코디·병원)이면 추적을 끈다(우리 방문이 지표를 부풀림)
  // ②일반 사용자는 계정 id(UUID)로 기기 간 연결. 이름·이메일 등 개인정보는 절대 보내지 않는다.
  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    setAnalyticsUser(session);
  }, [session]);

  const handleSetView = (viewName) => {
    setIsMobileMenuOpen(false);
    switch (viewName) {
      case "home":
        router.push("/");
        break;
      case "admin":
        router.push("/admin");
        break;
      case "list_treatment":
        router.push("/treatments");
        break;
      case "list_hospital":
        router.push("/hospitals");
        break;
      case "inquiry":
        router.push("/inquiry");
        break;
      case "login":
        router.push("/login");
        break;
      case "signup":
        router.push("/signup");
        break;
      case "success":
        router.push("/success");
        break;
      default:
        router.push("/");
    }
  };

  const handleNavClick = (targetView) => handleSetView(targetView);

  const handleLogout = async () => {
    const supabaseClient = await loadSupabase();
    await supabaseClient.auth.signOut();
    toast.success(t("auth.logoutSuccess", getLangCodeFromCookie()));
    router.push("/");
  };

  const handleGlobalInquiry = () => {
    router.push("/inquiry");
    setIsMobileMenuOpen(false);
  };

  const getCurrentView = useMemo(() => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/treatments")) return "list_treatment";
    if (pathname.startsWith("/hospitals")) return "list_hospital";
    return "";
  }, [pathname]);

  // 인콰이어리(문의 퍼널)는 집중 태스크 흐름 → 하단 탭바 숨겨 채팅·폼 공간 확보(모바일)
  const hideBottomNav = pathname.includes("success") || pathname.includes("/inquiry");
  // 포털(자체 깔끔한 상단바 + 공개 헤더/하단바/푸터 숨김): 관리자·국내병원·해외에이전시/의료기관·환자
  // ⚠️ /patient 누락 시: 공개 헤더+공개 하단바(진료과목/문의/병원)+푸터가 환자 레이아웃의
  //    자체 하단탭(홈/문서/더보기) 위에 겹쳐 모바일 레이아웃이 깨짐(2026-06-23 PO 신고, POSTMORTEMS #32).
  const isPortalPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/coordinator") ||
    pathname.startsWith("/hospital") ||
    pathname.startsWith("/agency") ||
    pathname.startsWith("/clinic") ||
    pathname.startsWith("/patient");

  // --- Idle timeout (portal pages only, 10 min) ---
  const IDLE_LIMIT_MS = 10 * 60 * 1000;
  const WARNING_MS = 9 * 60 * 1000;
  const CHECK_INTERVAL_MS = 30 * 1000;
  const THROTTLE_MS = 1000;

  const lastActivityRef = useRef(0);
  const warningShownRef = useRef(false);
  const throttleRef = useRef(0);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current < THROTTLE_MS) return;
    throttleRef.current = now;
    lastActivityRef.current = now;
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    // 환자 포털은 portal 크롬은 쓰되 10분 자동 로그아웃은 제외 — 환자가 콘텐츠 읽는 중 끊기지 않게
    if (!isPortalPage || pathname.startsWith("/patient") || !session) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_LIMIT_MS) {
        clearInterval(timer);
        events.forEach((e) => window.removeEventListener(e, resetActivity));
        loadSupabase().then((supabaseClient) => supabaseClient.auth.signOut()).then(() => {
          toast.error(t("auth.autoLogoutSecurity", getLangCodeFromCookie()));
          router.push("/login");
        });
        return;
      }
      if (idle >= WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning(t("auth.autoLogoutWarning", getLangCodeFromCookie()));
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, resetActivity));
    };
  }, [isPortalPage, pathname, session, resetActivity, router, toast]);

  return (
    <LangProvider initialLang={initialLang}>
      <ClientShellContent
        isPortalPage={isPortalPage}
        session={session}
        siteConfig={siteConfig}
        getCurrentView={getCurrentView}
        handleSetView={handleSetView}
        handleLogout={handleLogout}
        handleGlobalInquiry={handleGlobalInquiry}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleNavClick={handleNavClick}
        isHospitalUser={isHospitalUser}
        hideBottomNav={hideBottomNav}
      >
        {children}
      </ClientShellContent>
    </LangProvider>
  );
}

function ClientShellContent({
  isPortalPage,
  session,
  siteConfig,
  getCurrentView,
  handleSetView,
  handleLogout,
  handleGlobalInquiry,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleNavClick,
  isHospitalUser,
  hideBottomNav,
  children,
}) {
  const langCode = useLang();
  const pathname = usePathname() || "/";
  // 영상 상담방 — 전체화면 몰입(전역 헤더/푸터/하단네비/문의버튼 숨김)
  // 크롬(헤더·푸터·하단탭) 없이 내용만 렌더하는 **단일 작업 페이지**.
  // - /consultation/ : 화상상담방
  // - /survey/       : 메일 링크로 바로 들어오는 만족도 설문. 마케팅 헤더가 붙으면
  //   ①"로그인/회원가입"이 떠서 "로그인해야 답할 수 있나?"로 읽히고 ②진료과목·병원 메뉴가
  //   답하러 온 환자를 다른 데로 내보낸다. 2분짜리 설문에 나갈 길만 6개 달아준 꼴이다.
  //   포털 취급(PortalTopBar)도 안 된다 — 거긴 '로그아웃'이 있는데 설문 응답자는 계정이 없다.
  //   (2026-07-22 PO 지적: "이건 설문지 아냐? 로그인해야해?")
  // - /demo/       : 병원 사이트 「판」 시연. 판은 **자체 헤더·푸터를 가진 별도 제품**이라
  //   healwith 크롬이 붙으면 남의 병원 화면 위에 우리 메뉴(진료과목·병원·비자 가이드)가
  //   얹혀 «누구 사이트인지» 가 무너진다. 실제로 그렇게 떴다(2026-07-28 PO 지적).
  const isConsultationPage =
    pathname.startsWith("/consultation/") ||
    pathname.startsWith("/survey/") ||
    pathname.startsWith("/demo/");
  // 문의 퍼널(/inquiry) — AI 챗·폼 집중 흐름. 하단 사이트 푸터(회사정보 등)가 채팅 밑에
  // 붙어 화면이 길어지고 "풀스크린 챗" 느낌을 깨므로 푸터 숨김(하단탭바는 이미 숨김).
  const hideFooter = pathname.includes("/inquiry");
  // 본문 바로가기(skip link) — 키보드/스크린리더 사용자가 반복 영역(헤더·네비)을 건너뛰게.
  // KWCAG 2.4.1(반복 영역 건너뛰기) — 정부 웹접근성 평가 필수 항목.
  const SKIP_LABEL = {
    ko: "본문 바로가기", en: "Skip to main content", ru: "Перейти к содержимому",
    kz: "Негізгі мазмұнға өту", zh: "跳到主要内容", ja: "本文へスキップ",
  };
  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen min-h-screen-safe relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {SKIP_LABEL[langCode] || SKIP_LABEL.en}
      </a>
      {isConsultationPage ? null : isPortalPage ? (
        <PortalTopBar session={session} onLogout={handleLogout} siteConfig={siteConfig} langCode={langCode} />
      ) : (
        <Header
          setView={handleSetView}
          view={getCurrentView}
          handleGlobalInquiry={handleGlobalInquiry}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onNavClick={handleNavClick}
          session={session}
          onLogout={handleLogout}
          siteConfig={siteConfig}
          isHospitalUser={isHospitalUser}
          langCode={langCode}
        />
      )}

      <ErrorBoundary>
        <main id="main-content" className={isPortalPage || isConsultationPage || hideBottomNav ? "" : "pb-[calc(6rem+var(--cookie-banner-h,0px))] pb-safe-area"}>{children}</main>
      </ErrorBoundary>

      {/* 푸터에 붙어 있던 `pt-safe-area` 제거(2026-08-03) — 위쪽 안전영역은 «화면 맨 위 상태표시줄»을
          피하는 값이라 맨 아래 푸터와는 상관이 없다. 설치 앱에서 푸터 위에 빈 칸만 만들던 오타성 클래스. */}
      {!isPortalPage && !isConsultationPage && !hideFooter && <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 text-sm text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-gray-900 font-bold">{SITE_INFO.brand.name}</div>
              <div className="text-xs text-gray-500 mt-2">
                {t("footer.tagline", langCode)}
              </div>
            </div>
            <div>
              <div className="text-gray-900 font-semibold mb-2">
                {t("footer.company", langCode)}
              </div>
              <ul className="space-y-1">
                {SITE_INFO.navigation.company.map((item) => (
                  <li key={item.href}>
                    <a className="touch-link hover:text-teal-700" href={item.href}>
                      {t(item.labelKey, langCode)}
                    </a>
                  </li>
                ))}
                {/* 러/카 검색 랜딩 내부링크 — 고아 페이지 해소(색인 우선순위↑) + 해당 언어 입구. 해당 언어 화면에만 노출.
                    라벨은 랜딩의 h1 과 같게 둔다. "러시아 환자분들께" 류는 이미 러시아어로 보고 있는 사람에겐
                    동어반복이고, 링크를 눌러 도착한 페이지 제목과도 안 맞아 오작동처럼 보였다(코디 문의 2026-07-22). */}
                {langCode === "ru" && (
                  <li>
                    <a className="touch-link hover:text-teal-700" href="/ru/for-russian-patients">Лечение рака в Корее</a>
                  </li>
                )}
                {langCode === "kz" && (
                  <li>
                    <a className="touch-link hover:text-teal-700" href="/kk/for-kazakh-patients">Кореяда онкология емдеу</a>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <div className="text-gray-900 font-semibold mb-2">
                {t("footer.legal", langCode)}
              </div>
              <ul className="space-y-1">
                {SITE_INFO.navigation.legal.map((item) => (
                  <li key={item.href}>
                    <a className="touch-link hover:text-teal-700" href={item.href}>
                      {t(item.labelKey, langCode)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-1.5 break-words">
            {/* 라벨은 6개 언어(PO 결정 2026-07-22). 값은 고유명사·번호라 그대로 두되,
                ①사업자 구분은 분류라 번역 ②주소·대표자·개인정보책임자는 한국어 화면만 한글
                (외국어 화면에선 로마자가 서류·택시에 실제로 쓸모 있다 — copyrightKo 와 같은 분기). */}
            {SITE_INFO.legal.serviceName && <div>{t("footer.biz.serviceName", langCode)}: {SITE_INFO.legal.serviceName}</div>}
            {SITE_INFO.legal.operatedBy && <div>{t("footer.biz.operatedBy", langCode)}: {SITE_INFO.legal.operatedBy}</div>}
            {SITE_INFO.legal.operatedBy && <div>{t("footer.biz.businessType", langCode)}: {t("footer.biz.soleProprietor", langCode)}</div>}
            {(langCode === "ko" ? SITE_INFO.legal.representativeKo : SITE_INFO.legal.representative) && (
            <div>
              {t("footer.biz.representative", langCode)}:{" "}
              {langCode === "ko" ? SITE_INFO.legal.representativeKo : SITE_INFO.legal.representative}
            </div>
            )}
            {SITE_INFO.legal.businessRegistrationNumber && (
            <div>
              {t("footer.biz.regNumber", langCode)}:{" "}
              {SITE_INFO.legal.businessRegistrationNumber}
            </div>
            )}
            {SITE_INFO.legal.foreignPatientAttractionRegistration && (
            <div>
              {t("footer.biz.attractionReg", langCode)}:{" "}
              {SITE_INFO.legal.foreignPatientAttractionRegistration}
            </div>
            )}
            {(langCode === "ko" ? SITE_INFO.legal.guaranteeInsurerKo : SITE_INFO.legal.guaranteeInsurer) && (
            <div>
              {t("footer.biz.insurance", langCode)}:{" "}
              {langCode === "ko" ? SITE_INFO.legal.guaranteeInsurerKo : SITE_INFO.legal.guaranteeInsurer}
              {" ("}{t("footer.biz.insuranceScope", langCode)}{")"}
            </div>
            )}
            <div>
              {t("footer.biz.address", langCode)}:{" "}
              {langCode === "ko"
                ? SITE_INFO.legal.addressKo
                : `${SITE_INFO.legal.addressLine1} ${SITE_INFO.legal.addressLine2}`}
            </div>
            {SITE_INFO.legal.contactEmail && <div>{t("footer.biz.email", langCode)}: {SITE_INFO.legal.contactEmail}</div>}
            {(langCode === "ko" ? SITE_INFO.legal.privacyOfficerKo : SITE_INFO.legal.privacyOfficer) && (
            <div>
              {t("footer.biz.privacyOfficer", langCode)}:{" "}
              {langCode === "ko" ? SITE_INFO.legal.privacyOfficerKo : SITE_INFO.legal.privacyOfficer}
            </div>
            )}
            {/* 한국어 화면만 "힐위드" 병기(네이버 브랜드 매칭) — 영어 화면 한글누출 가드 준수 */}
            <div className="pt-2">{langCode === "ko" ? SITE_INFO.legal.copyrightKo : SITE_INFO.legal.copyright}</div>
          </div>
        </div>
      </footer>}

      {!hideBottomNav && !isPortalPage && !isConsultationPage && (
        <>
          <MobileBottomNav
            setView={handleSetView}
            view={getCurrentView}
            onInquiry={handleGlobalInquiry}
            onNavClick={handleNavClick}
          />
          <div className="hidden md:block">
            <FloatingInquiryBtn onClick={handleGlobalInquiry} />
          </div>
        </>
      )}

      {/* 상담방에서는 띄우지 않는다 — 배너가 `fixed bottom-0 … z-[9999]` 라서 하단 조작바
          (마이크·카메라·채팅·종료)를 그대로 덮는다. 2026-07-20 실통화 검증 중 채팅 버튼을
          누르려다 배너의 "자세히 보기" 링크가 눌려 **통화 중 상담방을 이탈**했다.
          헤더·푸터·하단내비·문의버튼은 이미 isConsultationPage 로 빠져 있었는데 이것만 누락. */}
      {!isConsultationPage && <CookieConsent />}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Portal Top Bar — 메인과 동일한 teal 톤, 좌측 로고로 메인 이동
   ────────────────────────────────────────────── */
function PortalTopBar({ session, onLogout, siteConfig, langCode }) {
  return (
    // ⚠️ 안전영역 여백(pt-safe-area)은 «바깥», 바 높이(h-14)는 «안쪽» 이어야 한다.
    //    한 칸에 같이 걸면 padding 이 height 안으로 먹혀(border-box) 바가 안 내려가고
    //    로고만 찌그러진다(2026-07-28 실기기 발견). 본문 여백은 .healo-portal-offset 이 같은 값을 쓴다.
    <header className="fixed top-0 left-0 right-0 z-50 bg-teal-100 text-slate-700 border-b border-teal-200 shadow-sm pt-safe-area">
     <div className="h-14 md:h-16 flex items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
        {siteConfig?.logo ? (
          <img src={siteConfig.logo} alt={SITE_INFO.brand.name} className="h-8 w-auto object-contain" />
        ) : (
          <Logo tone="light" lang={langCode} />
        )}
      </Link>

      <div className="flex items-center gap-3 text-sm">
        {/* slate-500 → slate-600: 어드민 상단바(teal-100 배경) 위에서 4.22:1 로 AA 미달이었음 → 5.9:1 */}
        {session?.user?.email && (
          <span className="hidden md:block text-slate-600 truncate max-w-[180px]">
            {session.user.email}
          </span>
        )}

        {session?.user && <NotificationBell variant="inline" />}

        <PortalLangSwitcher langCode={langCode} />

        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-slate-600 hover:text-teal-700 transition-colors ml-1"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">{t("auth.logout", langCode)}</span>
        </button>
      </div>
     </div>
    </header>
  );
}

/* 포털 전용 언어 스위처 — 해외 에이전시/의료기관·병원·코디·관리자가 자기 언어로.
   공개 페이지처럼 URL 언어화/리로드 없이 쿠키만 바꾸고 healo:langchange 로 즉시 리렌더. */
function PortalLangSwitcher({ langCode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = LANG_OPTIONS_PRIMARY.find((l) => l.code === langCode) || LANG_OPTIONS_PRIMARY[0];
  const pick = (code) => {
    setOpen(false);
    // 어느 언어에서 어느 언어로 갈아탔나 — 번역 보강 우선순위의 근거.
    if (code !== langCode) { try { event(GA_EVENTS.LANGUAGE_CHANGED, { from: langCode, to: code }); } catch {} }
    setLangCookie(code);            // 공개/에이전시·의료기관용 (healo_lang)
    setBackofficeLangCookie(code);  // 스태프 포털용 (healo_bo_lang) — 코디/어드민 화면이 이걸 따름
    if (typeof window !== "undefined") window.dispatchEvent(new Event("healo:langchange"));
  };
  return (
    <div className="relative notranslate" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 transition-colors"
      >
        <Globe size={15} />
        <span className="text-sm font-medium hidden sm:inline">{current?.label}</span>
        <ChevronDown size={13} className={`opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
          {LANG_OPTIONS_PRIMARY.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5 transition-colors ${langCode === l.code ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <span>{l.label}</span>
              {langCode === l.code && <Check size={13} className="ml-auto text-teal-700 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
