import ImmuneHospitalClient from "./ImmuneHospitalClient";
import { localizedMeta, getRequestLocale, pickLocalized } from "@/lib/i18n/metadata";
import { IMMUNE_HOSPITAL as H } from "@/lib/data/immuneHospitalInfo";
import { breadcrumbLd, absoluteUrl } from "@/lib/seo/structuredData";
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.immune.title", "seo.immune.desc");
}

const baseMeta = {
  title: "Immune Hospital — 면력한방병원",
  description:
    "Immune Hospital — healwith's direct partner. Korean Medicine immune care for cancer patients. ITCRN 5-principles, 50,000+ cases, chef-led therapeutic meals. 4 branches in Seoul & Gyeonggi.",
  keywords: ["면력한방병원", "Immune Hospital Korea", "Korean Medicine cancer immune therapy", "ITCRN protocol", "cancer hospital Seoul"],
  openGraph: {
    title: "Immune Hospital — Integrated cancer immune care in Korea",
    description:
      "50,000+ cancer patient cases. 5-principle ITCRN protocol. Chef-led therapeutic meals. healwith's direct partner.",
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
    "Immune Hospital is healwith's direct partner specializing in Korean Medicine immune therapy for cancer patients. Operating with the ITCRN 5-principle protocol and over 50,000 cancer patient cases.",
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
    { "@type": "MedicalTherapy", name: "ITCRN Immune Therapy Protocol" },
    { "@type": "MedicalTherapy", name: "Korean Medicine Immune Care" },
    { "@type": "MedicalTherapy", name: "Therapeutic Meal Program" },
    // 러시아어 표기 추가
    { "@type": "MedicalTherapy", name: "Иммунотерапия по протоколу ITCRN" },
    { "@type": "MedicalTherapy", name: "Корейская медицина — онкоиммунология" },
  ],
  numberOfBeds: null,
  geo: {
    "@type": "GeoCoordinates",
    latitude: 37.5583,
    longitude: 126.8339,
  },
  // ⚠️ 예전엔 여기에 parentOrganization: healwith 가 있었는데 **사실이 아니라 지웠다**(2026-07-28).
  // 면력한방병원은 healwith 의 하위 조직이 아니라 **제휴 병원**이다. 구조화데이터는 AI 가 그대로
  // 사실로 받아들이는 자리라, 소유 관계를 잘못 적으면 "healwith 가 병원을 운영한다"는 허위가 퍼진다.
  // (schema.org 에 「제휴」를 뜻하는 조직 속성이 없어서, 틀린 관계를 적느니 안 적는 쪽을 택했다.)
};

/**
 * 의료진을 기계가 읽는 형태로(Person) 병원 노드에 붙인다.
 *
 * 왜: 의료는 «누가 말했나»가 신뢰 판단의 핵심이라, 답변엔진이 의료 질문에 답할 때 특히 크게 본다.
 *     의료진은 이미 이 페이지 화면에 떠 있는데 표기만 없었다(= AI 는 "이름 있는 사람들"로만 보임).
 *     화면에 보이는 것과 **같은 데이터**(IMMUNE_HOSPITAL.doctors)를 그대로 쓰므로 어긋날 수 없다.
 *
 * 타입 선택: schema.org 의 `Physician` 은 «개인 의사»가 아니라 «진료소(조직)» 이다.
 *     개인은 `Person` + jobTitle/knowsAbout 이 맞고 지원도 넓다.
 */
function doctorNodes(lang) {
  return (H.doctors || []).map((d) => {
    const node = {
      "@type": "Person",
      name: pickLocalized(d.name, lang),
      jobTitle: pickLocalized(d.role, lang),
      worksFor: { "@type": "Hospital", name: hospitalJsonLd.name },
    };
    const spec = pickLocalized(d.specialty, lang);
    if (spec) node.knowsAbout = spec;
    if (d.photo) node.image = `https://healwith.co.kr${d.photo}`;
    return node;
  });
}

export default async function ImmuneHospitalPage() {
  const { locale } = await getRequestLocale();
  const employees = doctorNodes(locale);
  // url 은 요청 언어를 붙여 canonical(/{언어}/hospitals/immune)과 일치시킨다 —
  // 맨 주소는 308 로 튕기므로 엔티티가 「튕기는 주소」를 가리키고 있었다.
  const hospital = {
    ...hospitalJsonLd,
    url: absoluteUrl("/hospitals/immune", locale),
    ...(employees.length ? { employee: employees } : {}),
  };
  // 이 전용 페이지는 [slug] 동적 라우트를 가로채므로 거기 있는 빵부스러기를 못 물려받는다
  // (2026-08-28 실측: 다른 병원은 나오는데 여기만 BreadcrumbList 0건이었다).
  const ld = [hospital, breadcrumbLd(
    [
      { name: "Home", url: "/" },
      { name: "Hospitals", url: "/hospitals" },
      { name: "Immune Hospital", url: "/hospitals/immune" },
    ],
    locale,
  )];

  return (
    <>
      <script
        id="jsonld-immune-hospital"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <ImmuneHospitalClient />
    </>
  );
}
