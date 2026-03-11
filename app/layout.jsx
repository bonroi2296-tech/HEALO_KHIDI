// ✅ 성능 최적화: CSS는 Next.js가 자동으로 최적화하지만, 명시적으로 처리
import "./globals.css";
import Providers from "./providers";
import ClientShell from "./ClientShell";
import AnalyticsWrapper from "./AnalyticsWrapper";

export const metadata = {
  title: {
    default: "HEALO | Korea Medical Concierge",
    template: "%s | HEALO",
  },
  description:
    "Find the best clinics in Korea. Compare treatments, doctors, and prices. Free quotes and full concierge service for international patients.",
  keywords: [
    "Korea medical tourism",
    "Korean hospitals",
    "Korean Medicine",
    "plastic surgery Korea",
    "medical concierge Korea",
    "한국 의료관광",
    "韩国医疗旅游",
    "韓国医療観光",
  ],
  openGraph: {
    title: "HEALO | Korea Medical Concierge",
    description:
      "Find the best clinics in Korea. Compare treatments, doctors, and prices. Free quotes and full concierge service.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "zh_CN", "ja_JP"],
  },
  alternates: {
    canonical: "https://healo.kr",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-sans text-gray-800 bg-gray-50 min-h-screen">
        {/* ✅ 성능 최적화: Google Analytics 조건부 로딩 */}
        <AnalyticsWrapper />
        <Providers>
          <ClientShell>{children}</ClientShell>
        </Providers>
      </body>
    </html>
  );
}
