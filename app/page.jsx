import { Suspense } from "react";
import { cookies } from "next/headers";
import HomeClient from "./home/HomeClient";
import HomeClientPremium from "./home/HomeClientPremium";
import Script from "next/script";
import { getServerDesignMode } from "@/lib/designMode";

// 홈 페이지 메타 — 언어별 alternates 로 각 언어권 검색엔진이 올바른 버전 노출
// Google·Yandex·Baidu 모두 hreflang 을 통해 언어별 title 매칭
export const metadata = {
  title: "healwith | Korea Cancer Care for International Patients · 해외 암환자 한국 치료 컨시어지",
  description:
    "Korean cancer care concierge for international patients. 해외 암환자를 위한 한국 암 전문의 원격 사전상담. Video pre-consultation with top oncologists, 6-language interpretation (RU/KZ/EN/ZH/JA/KO), full-journey support from diagnosis to follow-up.",
  keywords: [
    // 영어 (구글·전 세계)
    "Korea cancer treatment concierge",
    "international cancer patient Korea",
    "Korean oncology telemedicine",
    "cancer pre-consultation Korea",
    // 러시아어 (러시아·카자흐 Yandex)
    "лечение рака в Корее",
    "онкология Южная Корея",
    "дистанционная консультация онколога Корея",
    "медицинский туризм Корея",
    // 카자흐어
    "Кореядағы онкологиялық емдеу",
    "Корея медициналық туризм",
    // 한국어
    "해외 암환자 원격상담",
    "한국 암 전문의 컨시어지",
    "해외 환자 한국 암 치료",
    // 중국어·일본어
    "韩国癌症治疗",
    "韩国肿瘤医生",
    "韓国がん治療",
    "韓国腫瘍医",
  ],
  openGraph: {
    title: "healwith | Korea Cancer Care for International Patients",
    description:
      "Video pre-consultation with Korea's top oncologists · 6-language interpretation · Full-journey concierge from diagnosis to follow-up.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "ru_RU", "kk_KZ", "zh_CN", "ja_JP"],
  },
  twitter: {
    card: "summary_large_image",
    title: "healwith | Korea Cancer Care for International Patients",
    description:
      "Pre-consultation + interpretation + full-journey concierge for cancer patients seeking treatment in Korea.",
  },
  // alternates(hreflang/canonical)는 layout generateMetadata가 요청 언어별로 생성.
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "healwith",
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

export default async function HomePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const Client = mode === "legacy" ? HomeClient : HomeClientPremium;
  return (
    <>
      <Script
        id="jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense>
        <Client />
      </Suspense>
    </>
  );
}
