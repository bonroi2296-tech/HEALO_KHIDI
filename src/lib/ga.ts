declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const getGaId = () => process.env.NEXT_PUBLIC_GA_ID || "";

/**
 * 쿠키 동의가 "all"("Accept All")인지. 분석툴 로드/발화 게이트의 단일 기준.
 * CookieConsent.jsx 가 localStorage["healo_cookie_consent"] 에 "essential" | "all" 저장.
 * SSR/차단 환경에서는 false (안전: 동의 없으면 추적 X).
 */
export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("healo_cookie_consent") === "all";
  } catch {
    return false;
  }
};

export const pageview = (url: string) => {
  const gaId = getGaId();
  if (!gaId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", gaId, { page_path: url });
};

export const event = (action: string, params: Record<string, any> = {}) => {
  const gaId = getGaId();
  if (!gaId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
};
