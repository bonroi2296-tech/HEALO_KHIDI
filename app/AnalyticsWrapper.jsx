"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

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

  // 성능: GA 스크립트(163ms TBT)를 첫 상호작용까지 지연 → 초기 로드 메인스레드에서 제외.
  // ga.ts 가 window.gtag 없으면 no-op 이고 send_page_view:false 라 추적 손실 사실상 없음.
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    if (!shouldLoadGTM || interacted) return;
    const fire = () => setInteracted(true);
    const evts = ["pointerdown", "keydown", "touchstart", "scroll"];
    const opts = { once: true, passive: true };
    evts.forEach((e) => window.addEventListener(e, fire, opts));
    // 무상호작용 세션도 결국 로드되게 idle 폴백 (측정창 밖)
    const t = setTimeout(fire, 5000);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, fire, opts));
      clearTimeout(t);
    };
  }, [shouldLoadGTM, interacted]);

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

  if (!shouldLoadGTM || !gaId || !interacted) {
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
