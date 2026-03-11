declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const getGaId = () => process.env.NEXT_PUBLIC_GA_ID || "";

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
