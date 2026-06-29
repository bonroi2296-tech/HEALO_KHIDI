import { Suspense } from "react";
import HomeClient from "./home/HomeClient";
import Script from "next/script";
import { localizedMeta } from "@/lib/i18n/metadata";
import { partnerHospitalLdList } from "@/lib/seo/structuredData";

// 홈 페이지 메타 — 언어별 alternates 로 각 언어권 검색엔진이 올바른 버전 노출
// Google·Yandex·Baidu 모두 hreflang 을 통해 언어별 title 매칭
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.home.title", "seo.home.desc");
}

const baseMeta = {
  title: "healwith | Korea Cancer Care for International Patients · 해외 암환자 한국 치료 컨시어지",
  description:
    "Korean cancer care concierge for international patients. 해외 암환자를 위한 한국 암 전문의 원격 사전상담. Video pre-consultation with top oncologists, 6-language interpretation (RU/KZ/EN/ZH/JA/KO), full-journey support from diagnosis to follow-up.",
  keywords: [
    // 브랜드 (고유어 — 검색 시 1순위 노출 강화)
    "healwith",
    "힐위드",
    "healwith.co.kr",
    // 영어 (구글·전 세계)
    "Korea cancer treatment concierge",
    "international cancer patient Korea",
    "Korean oncology telemedicine",
    "cancer pre-consultation Korea",
    "second opinion Korea oncologist",
    "best cancer hospital Korea foreigners",
    "cost of cancer treatment in Korea",
    // 러시아어 (러시아·카자흐 Yandex — 핵심 시장, 고의도 롱테일)
    "лечение рака в Корее",
    "онкология Южная Корея",
    "дистанционная консультация онколога Корея",
    "медицинский туризм Корея",
    "второе мнение онколога Корея",
    "лучшие онкологические клиники Кореи",
    "сколько стоит лечение рака в Корее",
    "лечение рака желудка в Корее",
    // 카자흐어 (Yandex KZ)
    "Кореядағы онкологиялық емдеу",
    "Корея медициналық туризм",
    "Кореяда қатерлі ісікті емдеу",
    "Кореядағы онколог дәрігер",
    // 한국어
    "해외 암환자 원격상담",
    "한국 암 전문의 컨시어지",
    "해외 환자 한국 암 치료",
    "외국인 한국 암 치료 비용",
    "한국 암 병원 추천",
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
  url: "https://healwith.co.kr",
  logo: "https://healwith.co.kr/icons/icon-512x512.png",
  areaServed: [
    { "@type": "Country", name: "South Korea" },
    { "@type": "Country", name: "Kazakhstan" },
    { "@type": "Country", name: "Russia" },
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
  // 실제 제휴/협진 병원 네트워크(partnerHospitals 실데이터) — 검색엔진 전용, 화면 변화 0
  department: partnerHospitalLdList(),
};

export default async function HomePage() {
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
