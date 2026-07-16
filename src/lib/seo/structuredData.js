/**
 * SEO 구조화 데이터(JSON-LD) 헬퍼 — 검색엔진 전용(화면에 안 보임).
 *
 * 왜: 해외(러·카자흐·CIS) 암환자가 구글·얀덱스에서 우리를 더 잘 찾게(rich result).
 *     화면 변화 0, <script type="application/ld+json">로만 출력 → 시각 검증 불필요.
 *
 * 원칙: 실제 데이터만(가짜 평점·후기 schema 금지). 병원 네트워크는 partnerHospitals 실데이터 사용.
 */

import { getAllPartnerHospitals } from "@/lib/data/partnerHospitals";

const SITE_URL = "https://healwith.co.kr";
const ORG_NAME = "healwith";

// 브랜드 엔티티 단일 식별자. app/layout.jsx <head> 의 Organization/WebSite 노드와 같은 @id 를 쓰면
// 검색엔진이 "같은 회사/사이트"로 병합한다 → sameAs(공식 SNS) 같은 브랜드 신호가 흩어지지 않고 합쳐짐.
// ⚠️ layout.jsx 의 @id 와 반드시 동일해야 함(다르면 별개 회사로 읽혀 신호가 쪼개짐).
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

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

/**
 * WebSite + SearchAction — 구글 검색결과에 사이트 내 검색창(Sitelinks Search Box) 노출.
 * /search?q= 엔드포인트가 실재하므로 정당한 SearchAction.
 */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    // layout.jsx 의 WebSite(#website)와 같은 엔티티 → 병합. (@id 없으면 홈에 WebSite 노드가 2개로 중복)
    "@id": WEBSITE_ID,
    name: ORG_NAME,
    url: SITE_URL,
    inLanguage: ["ko", "en", "ru", "kk", "zh", "ja"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
 * 보험 가이드 페이지용 그래프: WebPage(주제=중증질환 보험의 한국 치료 커버) + BreadcrumbList.
 * @param {{ description?: string, url?: string }} [opts]
 */
export function insuranceGuideLd({ description, url = "/insurance" } = {}) {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cancer treatment in Korea covered by critical-illness insurance",
    url: `${SITE_URL}${url}`,
    description:
      description ||
      "How critical-illness insurance programs cover cancer treatment in Korea — coverage, process, and healwith's role as the Korea-side coordinator.",
    inLanguage: ["ko", "en", "ru", "kk", "zh", "ja"],
    // 익명 Organization 이면 layout 의 브랜드 엔티티와 별개로 읽힘 → @id 참조로 연결.
    publisher: { "@id": ORG_ID },
  };
  const crumbs = breadcrumbLd([
    { name: "Home", url: "/" },
    { name: "Insurance Guide", url: "/insurance" },
  ]);
  return [page, crumbs];
}

/**
 * 치료 여정 페이지용 그래프: MedicalBusiness(healwith, layout 브랜드 엔티티와 @id 병합) + BreadcrumbList.
 * @param {{ description?: string }} [opts]
 */
export function careJourneyLd({ description } = {}) {
  const business = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    // layout 의 브랜드 엔티티와 병합(같은 회사) → sameAs 등 브랜드 신호를 이 페이지에서도 공유.
    // ⚠️ url 은 일부러 안 넣는다: 여기에 페이지주소(/care-journey)를 넣으면 병합 후
    //    회사 엔티티의 url 이 페이지주소로 오염됨(회사 url 은 layout 이 SoR).
    "@id": ORG_ID,
    name: ORG_NAME,
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
