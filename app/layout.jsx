// ✅ 성능 최적화: CSS는 Next.js가 자동으로 최적화하지만, 명시적으로 처리
import "./globals.css";
import "./styles/healo-tokens.css";
import { headers, cookies } from "next/headers";
import Providers from "./providers";
import ClientShell from "./ClientShell";
import AnalyticsWrapper from "./AnalyticsWrapper";
import InstallPrompt from "./InstallPrompt";
import { localeAlternates, OG_LOCALE, getRequestLocale } from "@/lib/i18n/metadata";
import { getI18nOverrideMap } from "@/lib/content/i18nOverrides";
import { applyI18nOverrides, LANG_OPTIONS } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/config";
import { i18nInlineScript } from "@/lib/i18n/inlineScript";
import I18nOverridesApply from "./_components/I18nOverridesApply";

// kz(우리 내부 코드) → kk(BCP47 표준 카자흐 언어코드). <html lang>·hreflang용.
const HTML_LANG = { en: "en", ko: "ko", ru: "ru", kz: "kk", zh: "zh", ja: "ja" };

// 동적 메타데이터: 정적 필드 + 요청 언어별 hreflang/canonical/OG locale.
// 공개 페이지가 alternates를 따로 안 주면 이 layout 값을 물려받아 언어별로 맞춰짐.
export async function generateMetadata() {
  const { locale } = await getRequestLocale();
  // 언어화 안 된 요청(내부도구 등)은 alternates 생략 — 잘못된 canonical 방지.
  if (!locale) return baseMetadata;
  const alternates = await localeAlternates();
  const og = { ...baseMetadata.openGraph, locale: OG_LOCALE[locale] || "en_US" };
  return { ...baseMetadata, alternates, openGraph: og };
}

const baseMetadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr"),
  title: {
    default: "healwith | Korea Cancer Care for International Patients",
    template: "%s | healwith",
  },
  // "힐위드" 병기: 네이버는 keywords 태그를 안 보고 제목·설명·본문 글자만 매칭 → 한글 브랜드 검색 대응.
  description:
    "healwith(힐위드) — Korean cancer care concierge for international patients from Kazakhstan, Russia, and Central Asia. Video pre-consultation with top oncologists, 6-language interpretation, and full-journey support — from diagnosis to post-treatment follow-up.",
  keywords: [
    // 브랜드 (고유어)
    "healwith",
    "힐위드",
    // 영어
    "Korea cancer treatment",
    "Korean oncology specialist",
    "cancer concierge Korea",
    "international cancer patient",
    "telemedicine Korea oncology",
    "medical tourism cancer Korea",
    "second opinion Korea oncologist",
    // 러시아어 (카자흐·러시아 검색 타겟)
    "лечение рака в Корее",
    "онкология Южная Корея",
    "корейские онкологи",
    "медицинский туризм Корея",
    "второе мнение онколога Корея",
    // 카자흐어
    "Кореядағы онкологиялық емдеу",
    "Корея медициналық туризм",
    "Кореядағы онколог дәрігер",
    // 한국어
    "한국 암 치료 컨시어지",
    "해외 암환자 원격상담",
    "한국 암 전문의",
    "외국인 한국 암 치료 비용",
    // 중국어·일본어
    "韩国癌症治疗",
    "韓国がん治療",
  ],
  openGraph: {
    title: "healwith | Korea Cancer Care for International Patients",
    description:
      "Video pre-consultation with Korea's top oncologists. Real-time interpretation in 6 languages (RU/KZ/EN/ZH/JA/KO). Full-journey concierge for cancer patients — from diagnosis to follow-up.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "ru_RU", "kk_KZ", "zh_CN", "ja_JP"],
    siteName: "healwith",
  },
  twitter: {
    card: "summary_large_image",
    title: "healwith | Korea Cancer Care for International Patients",
    description:
      "Video pre-consultation + 6-language interpretation + full-journey concierge for international cancer patients seeking treatment in Korea.",
  },
  // alternates(hreflang/canonical)는 generateMetadata에서 요청 언어별로 동적 생성.
  icons: {
    // /favicon.ico = 얀덱스 등 크롤러가 루트에서 기본으로 찾는 클래식 파비콘(16·32 임베드).
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "healwith",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  // ────────────────────────────────────────────────
  // Yandex SEO
  // ① Yandex Webmaster Console (https://webmaster.yandex.com) 에서
  //    사이트를 추가한 뒤, HTML-tag 검증을 선택하면 아래와 같은 코드가 발급됩니다.
  //    예: <meta name="yandex-verification" content="xxxxxxxxxxxxxxxx" />
  //    발급된 16자리 값으로 아래 플레이스홀더를 교체하세요.
  // Google·Yandex 는 DNS TXT 로 소유권 인증 완료(2026-06-22). 메타는 보조.
  verification: {
    // Yandex Webmaster (DNS 인증 완료, 메타는 백업)
    yandex: "0b937ceaae803c46",
    // Naver 서치어드바이저 — naver-site-verification (verification.other 로 렌더)
    other: {
      "naver-site-verification": "84eb0689784dd76b4841a4feba55a6c557f680ad",
    },
  },
  // ────────────────────────────────────────────────
  // Geo 메타 — Yandex 지역 신호 (면력한방병원 강서점 기준)
  // ICBM: 위도 37.5583, 경도 126.8339 (강서구)
  geo: {
    region: "KR-11",      // ISO 3166-2 서울특별시
    placename: "Seoul",
    position: "37.5583;126.8339",
    ICBM: "37.5583, 126.8339",
  },
};

export default async function RootLayout({ children }) {
  // 미들웨어가 URL 언어 prefix(/ru/ 등)에서 읽어 x-locale 헤더로 넘긴다. → 서버가 그 언어로 렌더(SEO).
  //
  // x-locale 이 없다 = proxy.ts 의 PUBLIC_PREFIXES 밖. 대부분 포털·토큰 링크·인증 화면이고,
  // sitemap 에 실리는 URL 은 전부 PUBLIC_PREFIXES 안이라 색인 대상엔 항상 x-locale 이 붙는다
  // (색인되는데 x-locale 이 없는 예외: /agency·/clinic·/notifications — 아래 SEO 설명 참고).
  // 그때는 en 으로 굳히지 말고 **쿠키 언어로 서버 렌더**한다 — 안 그러면 러시아어 환자가
  // /patient 를 열 때 첫 화면이 영어였다가 JS 붙은 뒤 러시아어로 바뀐다(영문 깜빡임,
  // KNOWN_ISSUES·POSTMORTEMS #133 후속).
  // SEO 불변인 이유: ①sitemap URL 은 전부 x-locale 이 붙어 이 분기를 안 탄다 ②x-locale 이
  // 없으면 localeAlternates() 가 null 이라 canonical/hreflang 자체가 안 나간다 ③검색봇은
  // 쿠키가 없어 en 그대로다.
  const cookieLang = (await cookies()).get("healo_lang")?.value;
  // ⚠️ 검증 기준은 **LOCALES(활성 6개)** 다. LANG_OPTIONS(21개)로 검증하면 안 된다 —
  //    setLangCookie 는 옛 21개 언어를 1년짜리 쿠키로 심었고(vi·ar 등 실제로 남아 있다,
  //    src/lib/legal/medicalDisclaimer.js 참고), HTML_LANG 매핑은 6개뿐이라
  //    「본문은 베트남어인데 <html lang="en">」 이 된다. 그 불일치는 브라우저 자동번역을
  //    부르는 조건이고, 자동번역은 우리가 아직 못 닫은 NotFoundError 8건의 유력 용의자다
  //    (POSTMORTEMS #133). 6개 밖의 옛 쿠키는 en 으로 떨어뜨리는 게 맞다.
  const ssrLang = LOCALES.includes(cookieLang) ? cookieLang : null;
  const lang = (await headers()).get("x-locale") || ssrLang || "en";
  // 코디 콘텐츠 편집 오버라이드: 서버에서 로드 → SSR t() 즉시 반영 + 클라 provider 로 주입.
  // 비면 t() 기존 사전 동작(안 깨짐).
  const i18nOverrides = await getI18nOverrideMap();
  applyI18nOverrides(i18nOverrides);

  // 브라우저에 심을 사전 목록. 21개 언어 통짜를 번들에서 뺀 대신 「필요한 언어만」 넣는다.
  // 보통 1개. 사용자가 쿠키로 URL 언어와 다른 언어를 골라둔 경우에만 2개 —
  // LangProvider 가 하이드레이션 후 쿠키 언어로 바꾸므로 그 사전이 없으면 글자가 빈다.
  // ⚠️ 여기는 위(ssrLang)와 **일부러 기준이 다르다**: 사전 주입 목적이라 21개 전체가 맞다.
  //    옛 언어 쿠키(vi 등)를 든 사용자도 하이드레이션 뒤엔 LangContext 가 그 언어로 바꾸므로
  //    그 사전이 없으면 글자가 빈칸이 된다. 서버 렌더 언어(6개)와 혼동 금지.
  const dictCookieLang = LANG_OPTIONS.some((l) => l.code === cookieLang) ? cookieLang : null;
  const clientLangs = [lang, dictCookieLang]
    .filter((v, i, a) => v && a.indexOf(v) === i);

  return (
    // suppressHydrationWarning: 브라우저 확장(예: 한글 HWP 뷰어 rhwp 가 data-hwp-extension 주입)이
    // hydration 전에 <html> 속성을 건드려도 경고가 안 뜨게. 확장 종류 무관·안전(루트 태그 한정).
    <html lang={HTML_LANG[lang] || "en"} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0d9488" />
        {/* 이 방문자 언어의 사전만 주입 (21개 언어 통짜 = 번들 264KB 를 뺀 대신).
            t() 는 화면 곳곳에서 동기로 불리므로 React 가 붙기 전에 값이 있어야 한다
            (나중에 도착하는 방식이면 글자가 빈칸으로 그려졌다 채워진다).

            ⚠️ 왜 「별도 파일 + beforeInteractive」가 아니라 인라인인가 (2026-07-27 실측):
            별도 파일로 하면 Next 가 head 에 <link rel="preload" as="script"> 를 넣는데
            이게 High 우선순위라 CSS·히어로 이미지와 첫 화면 대역폭을 다툰다.
            같은 조건 3안 비교(로컬 프로덕션 빌드, Lighthouse 모바일 3회, FCP 시뮬):
              외부파일 3894~3942ms / 사전 없음(대조군) 1226~3284ms / 인라인 2440~2482ms.
            인라인이 외부파일보다 FCP 약 1.45초 빠르고 성능 점수도 3~4점 높았다.
            되돌리고 싶으면 이 3안 실측부터 다시 하고 판단할 것. */}
        <script dangerouslySetInnerHTML={{ __html: i18nInlineScript(clientLangs, lang) }} />
        {/* 브랜드 구조화데이터(JSON-LD): "힐위드"를 healwith의 공식 별칭으로 선언 — 네이버·구글 한글 브랜드 검색 매칭 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://healwith.co.kr/#website",
                  name: "healwith",
                  alternateName: ["힐위드", "Healwith"],
                  url: "https://healwith.co.kr",
                  inLanguage: ["ko", "en", "ru", "kk", "zh", "ja"],
                  publisher: { "@id": "https://healwith.co.kr/#organization" },
                },
                {
                  "@type": "Organization",
                  "@id": "https://healwith.co.kr/#organization",
                  name: "healwith",
                  alternateName: ["힐위드", "Healwith"],
                  url: "https://healwith.co.kr",
                  logo: "https://healwith.co.kr/icons/icon-512x512.png",
                  // 동명이인(healwith.com 홍콩 등)과 구별시키는 엔티티 명세. 구글이 "healwith=이 회사"로 못박게.
                  description:
                    "International cancer-patient concierge connecting patients from Kazakhstan, Russia and the CIS with Korean oncology hospitals — online pre-consultation, remote diagnosis, care-path design, and post-return care.",
                  areaServed: [
                    { "@type": "Country", name: "South Korea" },
                    { "@type": "Country", name: "Kazakhstan" },
                    { "@type": "Country", name: "Russia" },
                  ],
                  // 공식 계정 = "healwith=이 회사" 확정 신호(동명이인 healwith.com 홍콩 등과 구별).
                  // ⚠️ 반드시 실재하는 공식 계정만(가짜·추측 URL 금지). 계정 추가/변경 시 여기도 갱신.
                  sameAs: [
                    "https://www.instagram.com/healwith.kz",
                    "https://www.facebook.com/profile.php?id=61590609467130",
                  ],
                },
              ],
            }),
          }}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Supabase(세션 확인)·Sentry(에러 전송) 는 첫 화면에서 바로 붙는데 연결(DNS+TLS)을
            그때 처음 맺느라 각각 ~300ms 를 버렸다 (2026-07-27 PageSpeed 실측).
            연결만 미리 열어둔다 — 요청 자체는 그대로. 주소는 env 에서 뽑아 하드코딩 드리프트 방지. */}
        {[process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SENTRY_DSN]
          .map((u) => { try { return new URL(u).origin; } catch { return null; } })
          .filter(Boolean)
          .map((origin) => <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />)}
        {/* Pretendard — dynamic-subset(페이지에 쓰인 글리프만 다운로드: 한글 풀폰트 수 MB → 수십 KB)
            + 비차단 로딩(렌더 차단 제거 → FCP/LCP 개선). font-display:swap 이라 폰트 도착 전엔
            시스템 폰트로 즉시 표시(텍스트 안 보임 현상 없음). 느린 CIS 회선 대응. */}
        <noscript>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css';l.media='print';l.onload=function(){this.media='all'};document.head.appendChild(l)})()`,
          }}
        />
      </head>
      <body className="font-sans text-gray-800 bg-gray-50 min-h-screen">
        {/* 청크 로딩 실패 자동 복구: 배포 직후 옛 JS 청크를 잡아 터질 때(ChunkLoadError /
            "reading 'call'" 등) 한 번만 새로고침해 새 청크로 복구. 10초 내 재발 시 새로고침
            안 함 → 무한루프 방지. ponytail: 10초 가드, 그래도 못 살리면 global-error 화면으로 떨어짐. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function c(m){return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|reading 'call'/i.test(m||'')}function g(m){if(!c(m))return;var k='chunk-reload-at',t=+sessionStorage.getItem(k)||0;if(Date.now()-t<10000)return;try{sessionStorage.setItem(k,Date.now())}catch(e){}location.reload()}window.addEventListener('error',function(e){g(e&&(e.message||(e.error&&e.error.message)))});window.addEventListener('unhandledrejection',function(e){g(e&&e.reason&&(e.reason.message||String(e.reason)))})})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister()})})}else{window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}}`,
          }}
        />
        {/* ✅ 성능 최적화: Google Analytics 조건부 로딩 */}
        <AnalyticsWrapper />
        <Providers>
          <I18nOverridesApply map={i18nOverrides}>
            <ClientShell initialLang={lang}>{children}</ClientShell>
          </I18nOverridesApply>
        </Providers>
        <InstallPrompt lang={lang} />
      </body>
    </html>
  );
}
