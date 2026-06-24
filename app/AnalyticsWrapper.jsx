"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent, GA_ID } from "@/lib/ga";

/**
 * healwith: Analytics 래퍼 (GA4 + Yandex Metrica)
 *
 * 로드 게이트 (전부 만족해야 로드):
 *  1) 쿠키 동의 == "all"  (GDPR — "Essential Only" 선택 시 절대 로드 X)
 *  2) production
 *  3) /admin 경로 아님
 *  4) 해당 분석툴 ID(env)가 있을 것
 *  5) 첫 상호작용/idle (성능: 메인스레드 TBT 회피, lazyOnload)
 *
 * 동의가 아직 없으면 CookieConsent의 "cookie-consent-granted" 이벤트를 리슨하다가
 * "Accept All" 시점에 로드한다. Yandex ID(NEXT_PUBLIC_YANDEX_METRICA_ID)가 없으면 완전 no-op.
 */
export default function AnalyticsWrapper() {
  const pathname = usePathname();
  const gaId = GA_ID;
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;
  const isProduction = process.env.NODE_ENV === "production";
  const isAdminPath = pathname?.startsWith("/admin");

  // 동의 == "all" 여부 (클라이언트에서만 확정). 초기엔 false → SSR/첫 렌더에서 절대 로드 안 함.
  const [consentGranted, setConsentGranted] = useState(false);
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      setConsentGranted(true);
      return;
    }
    // 아직 동의 전: "Accept All" 클릭 시 발화되는 이벤트를 기다린다.
    const onGranted = () => setConsentGranted(true);
    window.addEventListener("cookie-consent-granted", onGranted);
    return () => window.removeEventListener("cookie-consent-granted", onGranted);
  }, []);

  // 환경/경로 게이트 (동의와 무관한 부분)
  const envOk = isProduction && !isAdminPath;
  // 분석툴 자체를 띄울 수 있는 전제 (동의 + 환경). 실제 로드는 상호작용까지 지연.
  const allowAnalytics = consentGranted && envOk;

  // 성능: 동의가 있은 뒤에만 첫 상호작용/idle까지 지연 로드 (TBT 회피).
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    if (!allowAnalytics || interacted) return;
    const fire = () => setInteracted(true);
    const evts = ["pointerdown", "keydown", "touchstart", "scroll"];
    const opts = { once: true, passive: true };
    evts.forEach((e) => window.addEventListener(e, fire, opts));
    // 무상호작용 세션도 결국 로드되게 idle 폴백 (측정창 밖)
    const tm = setTimeout(fire, 5000);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, fire, opts));
      clearTimeout(tm);
    };
  }, [allowAnalytics, interacted]);

  // 디버그 로그 (개발 환경에서만)
  useEffect(() => {
    if (!isProduction) {
      console.log("[Analytics] 로드 게이트:", {
        gaId: gaId ? "설정됨" : "미설정",
        ymId: ymId ? "설정됨" : "미설정",
        isProduction,
        isAdminPath,
        consentGranted,
        willLoad: allowAnalytics && interacted,
      });
    }
  }, [gaId, ymId, isProduction, isAdminPath, consentGranted, allowAnalytics, interacted]);

  // 게이트: 동의(all) + 프로덕션 + 비admin + 상호작용 모두 충족해야 어떤 스크립트도 렌더 X
  if (!allowAnalytics || !interacted) {
    return null;
  }

  return (
    <>
      {/* Google Analytics 4 */}
      {gaId && (
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
      )}

      {/* Yandex Metrica (러시아/CIS 핵심 시장) — env 있을 때만. webvisor 등 민감 기능은 끔. */}
      {ymId && (
        <Script id="yandex-metrica" strategy="lazyOnload">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
ym(${ymId}, 'init', { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false });`}
        </Script>
      )}
    </>
  );
}

/* TODO(전환태그): 구글애즈/얀덱스 Direct conversion 태그는 실제 conversion ID가 발급된 뒤 추가.
   ID 없이 스니펫만 넣으면 동작 안 함 → PO가 광고계정 만든 후 env로 주입. (이 파일 게이트 재사용) */
