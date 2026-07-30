"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent, GA_ID, initDebugMode } from "@/lib/ga";
import GaDebugBadge from "./GaDebugBadge";

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

  // GA4 「DebugView」 스위치(?ga_debug=1). 스크립트를 짜기 전에 확정돼야 config 에 얹을 수 있다.
  const [debugOn, setDebugOn] = useState(false);
  useEffect(() => { setDebugOn(initDebugMode()); }, []);

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

  /**
   * gtag.js 로드 실패 → **한 번 재시도**한다.
   *
   * 왜 (2026-07-30 실서비스에서 실제로 발생):
   *   구글 쪽이 gtag.js 를 500 으로 한 번 튕기면, 지금 구조에서는 그 세션이
   *   **통째로 측정 0** 이 된다(경고 한 줄만 콘솔에 찍히고 화면은 멀쩡 → 아무도 모름).
   *   광고비가 들어가는 트래픽에서 이건 그대로 «성과가 없네»로 오독된다.
   *
   *   재시도가 실제로 복구가 되는 이유: 실패하는 동안에도 gtag() 호출은 dataLayer 배열에
   *   그대로 «쌓여»만 있다. 뒤늦게 gtag.js 가 내려오면 그 큐를 처음부터 처리하므로
   *   **놓친 config·이벤트까지 살아난다.**
   *
   *   next/script 는 같은 src 를 이미 로드했다고 기억해서 다시 안 받는다 → 재시도는
   *   스크립트 태그를 직접 붙인다. 재시도의 실패는 상태로 안 올려서 무한 반복을 막는다(총 2회).
   */
  const [loadFailed, setLoadFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  useEffect(() => {
    // ⚠️ allowAnalytics 를 «의존성으로» 넣어야 한다. 안 넣으면 대기 중(2.5초)에 사용자가
    //    /admin 으로 넘어가도 예약된 타이머가 그대로 터져서 **일부러 제외한 관리자 화면에**
    //    gtag.js 를 직접 꽂아버린다(위쪽 <Script> 게이트를 우회). 넣으면 게이트가 닫히는 순간
    //    이펙트가 다시 돌며 clearTimeout 으로 취소된다.
    if (!loadFailed || retried || !allowAnalytics) return;
    const tm = setTimeout(() => {
      setRetried(true);
      const s = document.createElement("script");
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      s.async = true;
      s.onerror = () => {
        console.warn("[Analytics] gtag.js 재시도도 실패 — 이 세션은 측정되지 않는다.");
      };
      document.head.appendChild(s);
    }, 2500);
    return () => clearTimeout(tm);
  }, [loadFailed, retried, gaId, allowAnalytics]);

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

  // 자가진단 배지(?ga_debug=1)는 **게이트에 막혔을 때도** 떠야 한다 — «왜 안 되는지»가
  // 대부분 이 게이트(쿠키 동의·상호작용 대기)이기 때문이다. 막힌 이유를 화면에 적어준다.
  const badge = debugOn ? (
    <GaDebugBadge
      gaId={gaId}
      consentGranted={consentGranted}
      isProduction={isProduction}
      isAdminPath={!!isAdminPath}
      interacted={interacted}
      loadFailed={loadFailed}
      retried={retried}
    />
  ) : null;

  // 게이트: 동의(all) + 프로덕션 + 비admin + 상호작용 모두 충족해야 어떤 스크립트도 렌더 X
  // ⚠️ 여기서도 «같은 모양»(Fragment)으로 돌려줘야 한다. 한쪽은 배지를 그대로, 다른 쪽은
  //    Fragment 로 돌려주면 리액트가 «다른 종류의 요소»로 보고 배지를 **처음부터 다시 만든다**
  //    → 방금 ✕ 로 닫은 배지가 즉시 되살아난다(닫는 클릭이 곧 첫 상호작용이라 실제로 벌어진다).
  if (!allowAnalytics || !interacted) {
    return <>{badge}</>;
  }

  return (
    <>
      {badge}
      {/* Google Analytics 4 */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="lazyOnload"
            onError={() => {
              if (typeof console !== "undefined" && console.warn) {
                console.warn("[Analytics] gtag.js 로드 실패(500 등). 2.5초 뒤 한 번 재시도한다. 페이지 동작에는 영향 없음.");
              }
              setLoadFailed(true);
            }}
          />
          {/* send_page_view:true → 랜딩(첫 진입) 조회를 GA가 자동 1회 집계.
              이후 SPA 페이지 이동은 ClientShell의 pageview()가 처리(같은 경로 중복 가드 있음).
              debug_mode → ?ga_debug=1 로 연 탭에서만 true. GA4 「DebugView」에 실시간으로 뜬다.
              config 단계에서 켜야 이후 이벤트 전체에 걸린다(이벤트별로도 한 번 더 붙임 — ga.ts). */}
          <Script id="ga-init" strategy="lazyOnload">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: true${debugOn ? ", debug_mode: true" : ""} });`}
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
