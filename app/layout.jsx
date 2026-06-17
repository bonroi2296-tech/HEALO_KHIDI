// ✅ 성능 최적화: CSS는 Next.js가 자동으로 최적화하지만, 명시적으로 처리
import "./globals.css";
import "./styles/healo-tokens.css";
import { headers } from "next/headers";
import Providers from "./providers";
import ClientShell from "./ClientShell";
import AnalyticsWrapper from "./AnalyticsWrapper";
import DesignToggle from "../components/healo/DesignToggle";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://khidi.healo.kr"),
  title: {
    default: "healwith | Korea Cancer Care for International Patients",
    template: "%s | healwith",
  },
  description:
    "Korean cancer care concierge for international patients from Kazakhstan, Russia, and Central Asia. Video pre-consultation with top oncologists, 6-language interpretation, and full-journey support — from diagnosis to post-treatment follow-up.",
  keywords: [
    // 영어
    "Korea cancer treatment",
    "Korean oncology specialist",
    "cancer concierge Korea",
    "international cancer patient",
    "telemedicine Korea oncology",
    "medical tourism cancer Korea",
    // 러시아어 (카자흐·러시아 검색 타겟)
    "лечение рака в Корее",
    "онкология Южная Корея",
    "корейские онкологи",
    "медицинский туризм Корея",
    // 카자흐어
    "Кореядағы онкологиялық емдеу",
    "Корея медициналық туризм",
    // 한국어
    "한국 암 치료 컨시어지",
    "해외 암환자 원격상담",
    "한국 암 전문의",
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
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
  verification: {
    // Google Search Console 코드 (기존 유지 or 추가)
    // google: "REPLACE_WITH_GOOGLE_SITE_VERIFICATION",
    // Yandex Webmaster 검증 코드
    yandex: "REPLACE_WITH_YANDEX_WEBMASTER_CODE",
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
    <html lang={HTML_LANG[lang] || "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0d9488" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-sans text-gray-800 bg-gray-50 min-h-screen">
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(reg){reg.unregister()})})}else{window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}}`,
          }}
        />
        {/* ✅ 성능 최적화: Google Analytics 조건부 로딩 */}
        <AnalyticsWrapper />
        <Providers>
          <ClientShell initialLang={lang}>{children}</ClientShell>
          <DesignToggle />
        </Providers>
      </body>
    </html>
  );
}
