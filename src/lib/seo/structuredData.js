/**
 * SEO 구조화 데이터(JSON-LD) 헬퍼 — 검색엔진 전용(화면에 안 보임).
 *
 * 왜: 해외(러·카자흐·CIS) 암환자가 구글·얀덱스에서 우리를 더 잘 찾게(rich result).
 *     화면 변화 0, <script type="application/ld+json">로만 출력 → 시각 검증 불필요.
 *
 * 원칙: 실제 데이터만(가짜 평점·후기 schema 금지). 병원 네트워크는 partnerHospitals 실데이터 사용.
 */

import { getAllPartnerHospitals } from "@/lib/data/partnerHospitals";

const SITE_URL = "https://khidi.healo.kr";
const ORG_NAME = "healwith";

/** 빵부스러기(BreadcrumbList) — 검색결과에 경로 표시 */
export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url?.startsWith("http") ? it.url : `${SITE_URL}${it.url || ""}`,
    })),
  };
}

/** 제휴/협진 병원 네트워크를 MedicalOrganization 배열로 (실데이터) */
export function partnerHospitalLdList() {
  return getAllPartnerHospitals().map((h) => {
    const node = {
      "@type": h.badge === "university" ? "Hospital" : "MedicalClinic",
      name: h.name?.en || h.name?.ko,
      medicalSpecialty: "Oncology",
    };
    if (h.address?.en || h.address?.ko) {
      node.address = { "@type": "PostalAddress", streetAddress: h.address.en || h.address.ko, addressCountry: "KR" };
    }
    if (h.phone) node.telephone = h.phone;
    if (h.website) node.url = h.website;
    return node;
  });
}

/**
 * 치료 여정 페이지용 그래프: MedicalBusiness(healwith) + BreadcrumbList.
 * @param {{ description?: string, url?: string }} [opts]
 */
export function careJourneyLd({ description, url = "/care-journey" } = {}) {
  const business = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: ORG_NAME,
    url: `${SITE_URL}${url}`,
    description:
      description ||
      "International cancer patient concierge connecting patients from CIS countries with Korean oncology hospitals. Online pre-consultation, remote diagnosis, care-path design, on-site companionship, and post-return care.",
    medicalSpecialty: "Oncology",
    areaServed: [
      { "@type": "Country", name: "South Korea" },
      { "@type": "Country", name: "Kazakhstan" },
      { "@type": "Country", name: "Russia" },
    ],
    availableLanguage: ["Korean", "English", "Russian", "Kazakh", "Chinese", "Japanese"],
    // 실제 제휴/협진 병원 네트워크(실데이터)
    department: partnerHospitalLdList(),
  };
  const crumbs = breadcrumbLd([
    { name: "Home", url: "/" },
    { name: "Care Journey", url: "/care-journey" },
  ]);
  return [business, crumbs];
}
