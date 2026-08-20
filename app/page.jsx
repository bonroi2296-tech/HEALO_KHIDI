import HomeClient from "./home/HomeClient";
import { localizedMeta } from "@/lib/i18n/metadata";
import { partnerHospitalLdList, websiteLd, ORG_ID } from "@/lib/seo/structuredData";
import { getMergedHomeContent } from "@/lib/content/overrides";
import { applyTenantBrand, isDefaultTenant, tenantBrandName } from "@/lib/tenant";

// 홈 페이지 메타 — 언어별 alternates 로 각 언어권 검색엔진이 올바른 버전 노출
// Google·Yandex·Baidu 모두 hreflang 을 통해 언어별 title 매칭
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.home.title", "seo.home.desc");
}

const baseMeta = {
  // 브랜드 표기는 테넌트에서 — healwith 면 아래 값이 예전과 글자까지 동일하다.
  title: applyTenantBrand(
    "healwith | Korea Cancer Care for International Patients · 해외 암환자 한국 치료 컨시어지",
    "ko",
  ),
  description: applyTenantBrand(
    "Korean cancer care concierge for international patients. 해외 암환자를 위한 한국 암 전문의 원격 사전상담. Video pre-consultation with top oncologists, 6-language interpretation (RU/KZ/EN/ZH/JA/KO), full-journey support from diagnosis to follow-up.",
    "ko",
  ),
  keywords: [
    // 브랜드 (고유어 — 검색 시 1순위 노출 강화). 도메인은 healwith 전용이라 테넌트가 바뀌면 뺀다.
    ...(isDefaultTenant()
      ? ["healwith", "힐위드", "healwith.co.kr"]
      : [tenantBrandName("en"), tenantBrandName("ko")]),
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
    title: applyTenantBrand("healwith | Korea Cancer Care for International Patients", "en"),
    description:
      "Video pre-consultation with Korea's top oncologists · 6-language interpretation · Full-journey concierge from diagnosis to follow-up.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "ru_RU", "kk_KZ", "zh_CN", "ja_JP"],
  },
  twitter: {
    card: "summary_large_image",
    title: applyTenantBrand("healwith | Korea Cancer Care for International Patients", "en"),
    description:
      "Pre-consultation + interpretation + full-journey concierge for cancer patients seeking treatment in Korea.",
  },
  // alternates(hreflang/canonical)는 layout generateMetadata가 요청 언어별로 생성.
};

// app/layout.jsx <head> 의 브랜드 엔티티(#organization)와 "같은 회사" → @id 로 병합시킨다.
// 그래야 layout 의 sameAs(공식 SNS)·설명·서비스국가 신호와 여기의 의료 정보가 한 엔티티로 합쳐진다
// (@id 없으면 홈에 회사가 2개로 쪼개져 읽혀 브랜드 신호가 흩어짐).
// ⚠️ 정체성(name·description·url·logo·areaServed)은 layout 이 단일 SoR — 여기서 다시 선언하면
//    병합 후 값이 충돌(설명 2개 등)하므로, 홈에서만 의미있는 의료 facet 만 얹는다.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "@id": ORG_ID,
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
  // 코디 편집 오버라이드를 서버에서 병합(없으면 기본값) → SSR HTML 에 실림(SEO 유지).
  const content = await getMergedHomeContent();
  return (
    <>
      <script
        id="jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, websiteLd()]) }}
      />
      {/* Suspense 로 감싸지 마라. fallback 없는 경계라 높이가 0으로 잡혀,
          서버가 「머리말 + 빈 본문 + 꼬리말」을 먼저 보내고 본문을 나중에 끼워 넣었다.
          그 사이 브라우저가 꼬리말을 화면 위에 그렸다가 본문이 도착하면 6,000px 아래로
          밀어내서 화면 밀림(CLS)이 0.97 까지 올랐다(목표 0.1). 2026-08-20 실측. */}
      <HomeClient content={content} />
    </>
  );
}
