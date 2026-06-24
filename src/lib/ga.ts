declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// ponytail: GA4 측정ID는 공개값(브라우저 번들에 노출). Vercel env(NEXT_PUBLIC_GA_ID)가
// 옛 실험 속성 G-TH0ZK2G9B9 로 오염돼 있어, 코드 상수를 단일 진실원천으로 고정한다.
// 정식 속성: healwith-cb0cb (Probelle 계정). 속성 바꾸려면 여기 한 줄만 수정.
export const GA_ID = "G-6JJCQXZJ9T";

const getGaId = () => GA_ID;

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
