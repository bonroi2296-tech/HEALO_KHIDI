"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { supabaseClient } from "../src/lib/data/supabaseClient";
import { SITE_INFO } from "../src/lib/siteSettings";
import { getLangCodeFromCookie, t } from "../src/lib/i18n";
import { LangProvider, useLang } from "../src/lib/i18n/LangContext";
import {
  Header,
  MobileBottomNav,
  FloatingInquiryBtn,
} from "../src/components.jsx";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { useToast } from "../src/components/Toast";
import CookieConsent from "../src/components/CookieConsent";
import EmergencyButton from "../components/healo/EmergencyButton";

export default function ClientShell({ children }) {
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
    console.log("[ClientShell] 🔍 Mounting, checking session...");
    
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

    supabaseClient.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          console.log("[ClientShell] ✅ Initial session:", session?.user?.email || "none");
          setSession(session);
          checkHospitalUser(session?.access_token);
        }
      });
      
    const { data } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          console.log("[ClientShell] 🔔 Auth state changed:", _event, session?.user?.email || "none");
          setSession(session);
          checkHospitalUser(session?.access_token);
        }
      }
    );
    
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
      
    return () => {
      mounted = false;
      if (data?.subscription) data.subscription.unsubscribe();
    };
  }, []);

  // pageview 추적 임시 비활성화: 자동 새로고침 문제 해결
  // const lastPageviewRef = useRef("");
  // useEffect(() => {
  //   if (lastPageviewRef.current === pathname) return;
  //   lastPageviewRef.current = pathname;
  //   pageview(pathname);
  // }, [pathname]);

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

  const hideBottomNav = pathname.includes("success");
  const isPortalPage = pathname.startsWith("/admin") || pathname.startsWith("/partner");

  // D. Premium 디자인 적용 라우트 — 자체 Nav/Footer를 가지므로 ClientShell의 Header/Footer 숨김
  // Premium 디자인 적용된 정확한 경로 (prefix 매칭은 아래 isPremiumPath 함수에서)
  const PREMIUM_ROUTES = [
    "/",
    "/intake",
    "/education",
    "/privacy",
    "/terms",
    "/medical-disclaimer",
    "/cookies",
    "/treatments",
    "/hospitals",
    "/visa",
    "/about",
    "/contact",
    "/success",
    "/search",
    "/faq",
    "/stories",
    "/hospitals/immune",
  ];
  const PREMIUM_PREFIXES = [
    "/hospitals/",     // /hospitals/[slug]
    "/treatments/",    // /treatments/[slug]
    "/specialties/",   // /specialties/*
    "/patient",        // /patient, /patient/chat, /patient/messages, /patient/calendar, etc.
  ];
  const isPremiumPath = (p) =>
    PREMIUM_ROUTES.includes(p) || PREMIUM_PREFIXES.some((pre) => p.startsWith(pre));
  const [isPremiumMode, setIsPremiumMode] = useState(true);
  useEffect(() => {
    try {
      // 우선순위: ?design= 쿼리 > 쿠키 > env
      const qs = new URLSearchParams(window.location.search);
      const q = qs.get("design")?.toLowerCase();
      if (q === "legacy" || q === "premium") {
        setIsPremiumMode(q === "premium");
        return;
      }
      const m = document.cookie.match(/(?:^|; )healo_design=([^;]*)/);
      if (m) {
        const v = decodeURIComponent(m[1]).toLowerCase();
        if (v === "legacy" || v === "premium") {
          setIsPremiumMode(v === "premium");
          return;
        }
      }
      const env = process.env.NEXT_PUBLIC_DESIGN?.toLowerCase();
      setIsPremiumMode(env !== "legacy");
    } catch {
      setIsPremiumMode(true);
    }
  }, [pathname]);
  const isPremiumPage = isPremiumMode && isPremiumPath(pathname);

  // --- Idle timeout (portal pages only, 10 min) ---
  const IDLE_LIMIT_MS = 10 * 60 * 1000;
  const WARNING_MS = 9 * 60 * 1000;
  const CHECK_INTERVAL_MS = 30 * 1000;
  const THROTTLE_MS = 1000;

  const lastActivityRef = useRef(Date.now());
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
    if (!isPortalPage || !session) return;

    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_LIMIT_MS) {
        clearInterval(timer);
        events.forEach((e) => window.removeEventListener(e, resetActivity));
        supabaseClient.auth.signOut().then(() => {
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
  }, [isPortalPage, session, resetActivity, router, toast]);

  return (
    <LangProvider>
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
        isPremiumPage={isPremiumPage}
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
  isPremiumPage = false,
  children,
}) {
  const langCode = useLang();
  const pathname = usePathname() || "/";
  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen min-h-screen-safe relative">
      {isPortalPage ? (
        <PortalTopBar session={session} onLogout={handleLogout} siteConfig={siteConfig} langCode={langCode} />
      ) : isPremiumPage ? null : (
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
        <main className={isPortalPage ? "" : "pb-24 pb-safe-area"}>{children}</main>
      </ErrorBoundary>

      {!isPortalPage && !isPremiumPage && <footer className="bg-white border-t border-gray-100 pt-safe-area">
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
                    <a className="hover:text-teal-600" href={item.href}>
                      {t(item.labelKey, langCode)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-gray-900 font-semibold mb-2">
                {t("footer.legal", langCode)}
              </div>
              <ul className="space-y-1">
                {SITE_INFO.navigation.legal.map((item) => (
                  <li key={item.href}>
                    <a className="hover:text-teal-600" href={item.href}>
                      {t(item.labelKey, langCode)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-1.5 break-words">
            <div>Service Name: {SITE_INFO.legal.serviceName}</div>
            <div>Operated by: {SITE_INFO.legal.operatedBy}</div>
            <div>Business Type: {SITE_INFO.legal.businessType}</div>
            <div>Representative: {SITE_INFO.legal.representative}</div>
            <div>
              Business Registration Number:{" "}
              {SITE_INFO.legal.businessRegistrationNumber}
            </div>
            <div>
              Foreign Patient Attraction Business Registration:{" "}
              {SITE_INFO.legal.foreignPatientAttractionRegistration}
            </div>
            <div>
              Address: {SITE_INFO.legal.addressLine1}{" "}
              {SITE_INFO.legal.addressLine2}
            </div>
            <div>Contact Email: {SITE_INFO.legal.contactEmail}</div>
            <div>
              Personal Information Protection Officer:{" "}
              {SITE_INFO.legal.privacyOfficer}
            </div>
            <div className="pt-2">{SITE_INFO.legal.copyright}</div>
          </div>
        </div>
      </footer>}

      {!hideBottomNav && !isPortalPage && !isPremiumPage && (
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

      <CookieConsent />

      {/* SOS — 로그인한 환자 페이지에만 표시 */}
      {pathname.startsWith("/patient") && !pathname.startsWith("/patient/education") && (
        <EmergencyButton />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Portal Top Bar — 메인과 동일한 teal 톤, 좌측 로고로 메인 이동
   ────────────────────────────────────────────── */
function PortalTopBar({ session, onLogout, siteConfig, langCode }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 md:h-16 z-50 bg-teal-600 text-white shadow-sm flex items-center justify-between px-4 pt-safe-area">
      <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
        {siteConfig?.logo ? (
          <img src={siteConfig.logo} alt="HEALO" className="h-8 w-auto object-contain" />
        ) : (
          <span className="text-xl font-extrabold tracking-tight notranslate">HEALO</span>
        )}
      </Link>

      <div className="flex items-center gap-3 text-sm">
        {session?.user?.email && (
          <span className="hidden md:block text-white/70 truncate max-w-[180px]">
            {session.user.email}
          </span>
        )}

        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-white/80 hover:text-white transition-colors ml-1"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">{t("auth.logout", langCode)}</span>
        </button>
      </div>
    </header>
  );
}
