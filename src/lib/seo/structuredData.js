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
// ⚠️ @id 를 쓰는 노드에 정체성(name·description·url·logo·areaServed)을 layout 과 "다른 값"으로
//    다시 선언하지 마라 — 병합 후 한 회사에 설명이 2개가 되거나 회사 url 이 페이지주소로 오염된다.
//    (같은 값이면 같은 triple 로 합쳐져 무해하다. 예: websiteLd 의 name·url.)
//    기본 방침은 "정체성은 layout 이 단일 SoR, 여기선 페이지별 facet 만" — 그게 충돌 여지가 없다.
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * 상대경로(/hospitals/x) → 절대 URL. locale 을 주면 언어 접두어를 붙인다.
 *
 * 왜 필요하나 (2026-08-31 감사): 구조화데이터의 url·빵부스러기 item 이 언어 없는 맨 주소였다.
 * 그런데 실제로 200 을 주는 정규 주소는 /{언어}/… 이고 맨 주소는 308 로 튕긴다
 * (proxy.ts). 즉 «canonical 은 /en/hospitals/x 라고 해놓고 구조화데이터는 /hospitals/x 를
 * 가리키는» 상태 — 같은 페이지를 두 주소로 말하는 셈이라 엔티티 신호가 흐려진다.
 * locale 이 없으면(내부도구 등) 예전과 똑같이 동작한다 = 안전한 기본값.
 */
export function absoluteUrl(path, locale) {
  if (!path) return locale ? `${SITE_URL}/${locale}` : SITE_URL;
  if (path.startsWith("http")) return path;
  const clean = path === "/" ? "" : path;
  return locale ? `${SITE_URL}/${locale}${clean}` : `${SITE_URL}${clean}`;
}

/** 빵부스러기(BreadcrumbList) — 검색결과에 경로 표시 */
export function breadcrumbLd(items, locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url, locale),
    })),
  };
}

/**
 * WebSite 구조화 데이터.
 * SearchAction(Sitelinks Search Box)은 2026-07-14 제거 — /search 라우트 비활성화(옛 프로젝트
 * 잔재, /hospitals 리다이렉트)로 엔드포인트가 실재하지 않게 됨. 검색을 재도입하면 그때 복원.
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
  };
}

/**
 * 제휴/협진 병원 네트워크를 «독립된 병원 엔티티 배열»로 (실데이터).
 *
 * ⚠️ 이 배열을 healwith 노드의 `department` 에 넣지 마라 (2026-09-01 감사에서 되돌림).
 *    schema.org 의 department 정의는 «그 조직의 부서 — 서점 안의 약국, 빵집 안의 카페»다.
 *    즉 예전 코드는 검색엔진과 답변엔진에게 **「신촌세브란스병원은 healwith 의 한 부서다」**
 *    라고 말하고 있었다. 셋 다 사실이 아니다:
 *      · healwith(보뉴아)는 병원이 아니라 **등록 외국인환자 유치업체**다 — 부서로 둘 병원이 없다.
 *      · 화면은 같은 병원들을 「제휴 병원 / 협진 대학병원」이라고 정확히 적고 있었다
 *        (app/home/HomeClient.jsx 의 badgePartner·badgeUniversity). 화면과 구조화데이터가
 *        서로 다른 말을 하고 있었던 것.
 *      · 남의 대학병원 4곳을 우리 소속으로 선언하는 건 표시광고 쪽에서도 안을 위험이 크다.
 *
 *    고친 방식: 관계를 «거짓으로» 적는 대신 **아무 관계도 적지 않는다.** 병원들은 같은
 *    JSON-LD 배열의 «형제 노드»로 나가고(그 페이지에 실제로 보이는 병원들이라 정당하다),
 *    「어떤 사이인가」는 화면 본문이 말한다(답변엔진은 어차피 본문을 읽는다).
 *    schema.org 에는 «제휴사»를 뜻하는 조직 간 속성이 없다 — 억지로 memberOf·subOrganization
 *    같은 걸 갖다 붙이면 department 와 똑같은 종류의 거짓말이 된다. 그래서 비워 둔다.
 *
 * @id 를 주는 이유: 형제 노드로 떼어 놓으면 식별자가 없는 «익명 노드»가 되어 검색엔진이
 *    페이지마다 다른 병원으로 셀 수 있다. 우리 이름공간의 고정 식별자를 붙여 홈·치료여정에서
 *    같은 엔티티로 합쳐지게 한다(병원 «본인»의 정체는 url = 각 병원 공식 사이트가 말한다).
 */
export function partnerHospitalLdList() {
  return getAllPartnerHospitals().map((h) => {
    const node = {
      "@type": h.badge === "university" ? "Hospital" : "MedicalClinic",
      "@id": `${SITE_URL}/#hospital-${h.slug}`,
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
 * @param {{ description?: string, url?: string, locale?: string }} [opts]
 *        locale 을 주면 주소에 언어 접두어를 붙인다(canonical 과 일치).
 */
export function insuranceGuideLd({ description, url = "/insurance", locale } = {}) {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cancer treatment in Korea covered by critical-illness insurance",
    url: absoluteUrl(url, locale),
    description:
      description ||
      "How critical-illness insurance programs cover cancer treatment in Korea — coverage, process, and healwith's role as the Korea-side coordinator.",
    inLanguage: ["ko", "en", "ru", "kk", "zh", "ja"],
    // 익명 Organization 이면 layout 의 브랜드 엔티티와 별개로 읽힘 → @id 참조로 연결.
    publisher: { "@id": ORG_ID },
  };
  const crumbs = breadcrumbLd(
    [
      { name: "Home", url: "/" },
      { name: "Insurance Guide", url: "/insurance" },
    ],
    locale,
  );
  return [page, crumbs];
}

/**
 * 치료 여정 페이지용 그래프: MedicalBusiness(healwith — layout 브랜드 엔티티에 @id 로 병합) + BreadcrumbList.
 * 회사 정체성(이름·설명·URL)은 layout.jsx 가 단일 SoR 이라 여기서 받지 않는다.
 * locale 은 빵부스러기 주소에만 쓴다(회사 노드는 주소를 선언하지 않으므로 영향 없음).
 */
export function careJourneyLd(locale) {
  const business = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    // layout 의 브랜드 엔티티와 같은 회사 → @id 로 병합(sameAs 등 브랜드 신호를 이 페이지에서도 공유).
    // 정체성(name·description·url·logo·areaServed)은 layout 이 SoR 이라 여기선 선언하지 않는다:
    //  · description 을 넣으면 병합 후 회사 설명이 2개로 충돌(페이지 카피가 브랜드 설명을 오염).
    //  · url 을 넣으면 회사 url 이 페이지주소(/care-journey)로 오염.
    "@id": ORG_ID,
    medicalSpecialty: "Oncology",
    availableLanguage: ["Korean", "English", "Russian", "Kazakh", "Chinese", "Japanese"],
  };
  const crumbs = breadcrumbLd(
    [
      { name: "Home", url: "/" },
      { name: "Care Journey", url: "/care-journey" },
    ],
    locale,
  );
  // 제휴/협진 병원은 healwith 의 «부서»가 아니라 형제 노드다 — 이유는 partnerHospitalLdList 주석.
  // 이 화면(CareJourneyClient «제휴 병원 네트워크» 칸)에 실제로 보이는 병원들이라 게재 근거가 있다.
  return [business, crumbs, ...partnerHospitalLdList()];
}
