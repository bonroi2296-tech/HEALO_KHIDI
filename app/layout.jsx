// ✅ 성능 최적화: CSS는 Next.js가 자동으로 최적화하지만, 명시적으로 처리
import "./globals.css";
import "./styles/healo-tokens.css";
import Providers from "./providers";
import ClientShell from "./ClientShell";
import AnalyticsWrapper from "./AnalyticsWrapper";

export const metadata = {
  metadataBase: new URL("https://khidi.healo.kr"),
  title: {
    default: "HEALO | Korea Medical Tourism Concierge",
    template: "%s | HEALO",
  },
  description:
    "Find the best clinics in Korea. Compare treatments, doctors, and prices. Free quotes and full concierge service for international patients.",
  keywords: [
    "Korea medical tourism",
    "Korean hospitals",
    "cancer treatment Korea",
    "Korean Medicine",
    "plastic surgery Korea",
    "medical concierge Korea",
    "한국 의료관광",
    "韩国医疗旅游",
    "韓国医療観光",
    "медицинский туризм Корея",
  ],
  openGraph: {
    title: "HEALO | Korea Medical Tourism Concierge",
    description:
      "Find the best clinics in Korea. Compare treatments, doctors, and prices. Free quotes and full concierge service.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "zh_CN", "ja_JP", "ru_RU"],
    siteName: "HEALO",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEALO | Korea Medical Tourism Concierge",
    description:
      "AI-powered medical concierge for international patients seeking treatment in Korea.",
  },
  alternates: {
    canonical: "/",
    languages: {
      'en': '/',
      'ko': '/?lang=ko',
      'ru': '/?lang=ru',
      'zh': '/?lang=zh',
      'ja': '/?lang=ja',
      'x-default': '/',
    },
  },
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
    title: "HEALO",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
