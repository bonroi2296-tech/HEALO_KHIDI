import { Suspense } from "react";
import HomeClient from "./home/HomeClient";
import Script from "next/script";

export const metadata = {
  title: "HEALO | 해외 암환자 ICT 사전상담 플랫폼",
  description:
    "해외 암환자를 위한 한국 암 전문의 원격 사전상담 및 사후관리 플랫폼. 6개국어 실시간 통역, 의료문서 관리, 교육 콘텐츠 제공.",
  keywords: [
    "cancer treatment Korea",
    "해외 암환자",
    "원격 암 상담",
    "ICT 사전상담",
    "онкология Корея",
    "Korea oncology consultation",
    "cancer pre-consultation platform",
    "한국 암 전문의 원격상담",
  ],
  openGraph: {
    title: "HEALO | 해외 암환자 ICT 사전상담 플랫폼",
    description:
      "한국 최고의 암 전문의와 원격 사전상담. 6개국어 실시간 통역 지원.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEALO | Cancer Pre-consultation Platform",
    description:
      "ICT pre-consultation & post-care platform connecting international cancer patients with Korean oncologists.",
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "HEALO",
  description:
    "ICT pre-consultation and post-care platform connecting international cancer patients with top Korean oncologists. Real-time interpretation in 6 languages.",
  url: "https://khidi.healo.kr",
  logo: "https://khidi.healo.kr/icons/icon-512x512.png",
  areaServed: [
    { "@type": "Country", name: "South Korea" },
  ],
  availableLanguage: [
    { "@type": "Language", name: "Korean" },
    { "@type": "Language", name: "Russian" },
    { "@type": "Language", name: "Kazakh" },
    { "@type": "Language", name: "English" },
    { "@type": "Language", name: "Chinese" },
    { "@type": "Language", name: "Japanese" },
  ],
  medicalSpecialty: ["Oncology"],
  serviceType: "Cancer Pre-consultation & Post-care Platform",
};

export default function HomePage() {
  return (
    <>
      <Script
        id="jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense>
        <HomeClient />
      </Suspense>
    </>
  );
}
