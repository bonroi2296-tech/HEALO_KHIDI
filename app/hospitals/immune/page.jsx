import ImmuneHospitalClient from "./ImmuneHospitalClient";
import { localizedMeta } from "@/lib/i18n/metadata";
import { IMMUNE_HOSPITAL } from "@/lib/data/immuneHospitalInfo";
import { createClient } from "@supabase/supabase-js";

// 지점별 구글 리뷰를 **서버에서** 읽어 카드에 얹는다.
// 왜 서버냐: 옛 지점 상세(/hospitals/[slug])는 클라이언트에서 받아와 서버 HTML 이 "로딩 중"뿐이었고
// 구글이 빈 페이지로 봤다. 이 페이지는 원래도 서버 렌더라 그 함정을 반복하지 않는다.
// 리뷰는 스크랩 스냅샷이라 자주 안 바뀜 → 하루 캐시.
export const revalidate = 86400;

async function getBranchReviews() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {}; // 로컬/프리뷰에 키가 없어도 페이지는 그대로 뜨게(리뷰만 생략)
  try {
    const slugs = IMMUNE_HOSPITAL.branches.map((b) => b.slug).filter(Boolean);
    const { data, error } = await createClient(url, key)
      .from("hospitals")
      .select("slug,external_ratings")
      .in("slug", slugs);
    if (error || !data) return {};
    const out = {};
    for (const row of data) {
      const list = (row.external_ratings?.google_reviews || []).filter(
        (r) => r && r.text && Number(r.rating) > 0
      );
      if (!list.length) continue;
      const avg = list.reduce((s, r) => s + Number(r.rating), 0) / list.length;
      const top = list.slice().sort((a, b) => Number(b.rating) - Number(a.rating))[0];
      out[row.slug] = {
        rating: Math.round(avg * 10) / 10,
        count: list.length,
        quote: String(top.text).replace(/\s+/g, " ").trim().slice(0, 90),
        author: top.author || null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.immune.title", "seo.immune.desc");
}

const baseMeta = {
  title: "Immune Hospital — 면력한방병원",
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

export default async function ImmuneHospitalPage() {
  const branchReviews = await getBranchReviews();
  return (
    <>
      <script
        id="jsonld-immune-hospital"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hospitalJsonLd) }}
      />
      <ImmuneHospitalClient branchReviews={branchReviews} />
    </>
  );
}
