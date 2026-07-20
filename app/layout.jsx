// ✅ 성능 최적화: CSS는 Next.js가 자동으로 최적화하지만, 명시적으로 처리
import "./globals.css";
import "./styles/healo-tokens.css";
import { headers } from "next/headers";
import Providers from "./providers";
import ClientShell from "./ClientShell";
import AnalyticsWrapper from "./AnalyticsWrapper";
import InstallPrompt from "./InstallPrompt";
import { localeAlternates, OG_LOCALE, getRequestLocale } from "@/lib/i18n/metadata";

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
  // 미들웨어가 URL 언어 prefix(/ru/ 등)에서 읽어 x-locale 헤더로 넘긴다.
  // 없으면(내부도구·prefix 미적용 경로) en. → 서버가 그 언어로 렌더(SEO).
  const lang = (await headers()).get("x-locale") || "en";
  return (
    // suppressHydrationWarning: 브라우저 확장(예: 한글 HWP 뷰어 rhwp 가 data-hwp-extension 주입)이
    // hydration 전에 <html> 속성을 건드려도 경고가 안 뜨게. 확장 종류 무관·안전(루트 태그 한정).
    <html lang={HTML_LANG[lang] || "en"} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0d9488" />
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
          <ClientShell initialLang={lang}>{children}</ClientShell>
        </Providers>
        <InstallPrompt lang={lang} />
      </body>
    </html>
  );
}
