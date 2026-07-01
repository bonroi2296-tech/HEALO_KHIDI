import ImmuneHospitalClient from "./ImmuneHospitalClient";
import { localizedMeta } from "@/lib/i18n/metadata";

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.immune.title", "seo.immune.desc");
}

const baseMeta = {
  title: "Immune Hospital — 면력한방병원 | healwith",
  description:
    "Immune Hospital — healwith's direct partner. Korean Medicine immune care for cancer patients. ITCR 5-principles, 50,000+ cases, chef-led therapeutic meals. 4 branches in Seoul & Gyeonggi.",
  keywords: ["면력한방병원", "Immune Hospital Korea", "Korean Medicine cancer immune therapy", "ITCR protocol", "cancer hospital Seoul"],
  openGraph: {
    title: "Immune Hospital — Integrated cancer immune care in Korea",
    description:
      "50,000+ cancer patient cases. 5-principle ITCR protocol. Chef-led therapeutic meals. healwith's direct partner.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Immune Hospital — 면력한방병원 | healwith",
    description: "50,000+ cancer patient cases. Korean Medicine immune therapy. 4 branches in Seoul & Gyeonggi.",
  },
};

const hospitalJsonLd = {
  "@context": "https://schema.org",
  "@type": "Hospital",
  name: "Immune Hospital (면력한방병원)",
  alternateName: [
    "면력한방병원",
    "Иммьюн Хоспитал",           // Cyrillic — Yandex 검색 대응
    "Корейская больница иммунитета",
  ],
  description:
    "Immune Hospital is healwith's direct partner specializing in Korean Medicine immune therapy for cancer patients. Operating with the ITCR 5-principle protocol and over 50,000 cancer patient cases.",
  url: "https://healwith.co.kr/hospitals/immune",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "Seoul",
    addressLocality: "Gangseo-gu",
    // Cyrillic 표기 (Yandex 대응)
    streetAddress: "서울특별시 강서구",
  },
  // Yandex 및 Google 모두 지원하는 다국어 필드
  availableLanguage: [
    { "@type": "Language", name: "Korean",    alternateName: "ko" },
    { "@type": "Language", name: "English",   alternateName: "en" },
    { "@type": "Language", name: "Russian",   alternateName: "ru" },
    { "@type": "Language", name: "Kazakh",    alternateName: "kk" },
  ],
  // 서비스 대상 국가 (중앙아시아 타겟)
  areaServed: [
    { "@type": "Country", name: "Kazakhstan",  sameAs: "https://www.wikidata.org/wiki/Q232" },
    { "@type": "Country", name: "Russia",      sameAs: "https://www.wikidata.org/wiki/Q159" },
    { "@type": "Country", name: "Kyrgyzstan",  sameAs: "https://www.wikidata.org/wiki/Q813" },
    { "@type": "Country", name: "Uzbekistan",  sameAs: "https://www.wikidata.org/wiki/Q265" },
  ],
  medicalSpecialty: ["Oncology", "Korean Medicine", "Integrative Medicine"],
  availableService: [
    { "@type": "MedicalTherapy", name: "ITCR Immune Therapy Protocol" },
    { "@type": "MedicalTherapy", name: "Korean Medicine Immune Care" },
    { "@type": "MedicalTherapy", name: "Therapeutic Meal Program" },
    // 러시아어 표기 추가
    { "@type": "MedicalTherapy", name: "Иммунотерапия по протоколу ITCR" },
    { "@type": "MedicalTherapy", name: "Корейская медицина — онкоиммунология" },
  ],
  numberOfBeds: null,
  geo: {
    "@type": "GeoCoordinates",
    latitude: 37.5583,
    longitude: 126.8339,
  },
  parentOrganization: {
    "@type": "Organization",
    name: "healwith",
    url: "https://healwith.co.kr",
  },
};

export default function ImmuneHospitalPage() {
  return (
    <>
      <script
        id="jsonld-immune-hospital"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hospitalJsonLd) }}
      />
      <ImmuneHospitalClient />
    </>
  );
}
