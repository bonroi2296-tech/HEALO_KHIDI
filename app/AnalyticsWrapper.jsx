"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

/**
 * healwith: Analytics 래퍼
 * 
 * 목적:
 * - 개발환경에서 GTM 로딩 방지
 * - /admin 경로에서 GTM 로딩 방지
 * - 프로덕션 + 일반 경로에서만 GTM 로드
 */
export default function AnalyticsWrapper() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const isProduction = process.env.NODE_ENV === "production";
  const isAdminPath = pathname?.startsWith("/admin");

  // GTM 로드 조건 (useMemo로 계산, setState 없이)
  const shouldLoadGTM = Boolean(gaId) && isProduction && !isAdminPath;

  // 디버그 로그 (개발 환경에서만, useEffect 없이)
  useEffect(() => {
    if (!isProduction) {
      console.log("[Analytics] GTM 로딩 조건:", {
        gaId: gaId ? "설정됨" : "미설정",
        isProduction,
        isAdminPath,
        shouldLoad: shouldLoadGTM,
      });
    }
  }, [gaId, isProduction, isAdminPath, shouldLoadGTM]);

  if (!shouldLoadGTM || !gaId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
        onError={() => {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[Analytics] GA/GTM 스크립트 로드 실패(500 등). 페이지 동작에는 영향 없음.");
          }
        }}
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
