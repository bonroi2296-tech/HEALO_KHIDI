import { notFound, redirect } from "next/navigation";
import { withQuery } from "@/lib/url/withQuery";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "@/lib/data/hospitals";
import { convertPartnerToInitialData } from "@/lib/data/partnerHospitals";
// 제휴 병원 정적 문구(이름·설명·주소)는 코디 편집이 덮인 사본을 쓴다(2026-09-06).
import { getMergedContentFiles } from "@/lib/content/contentFileOverrides";
import HospitalDetailClient from "./HospitalDetailClient";
import { localeAlternates, getRequestLocale, pickLocalized, ogLocaleFields } from "@/lib/i18n/metadata";
import { breadcrumbLd } from "@/lib/seo/structuredData";
import { resolveHospitalFaq } from "@/lib/data/hospitalDefaultFaq";

import { siteUrl } from "@/lib/siteUrl";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
// 🛑 여기서 `process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"` 를 다시 쓰지 마라.
//   실서비스에 그 환경변수가 «없어서» 폴백이 그대로 나갔고, 2026-09-09 실측으로 병원 상세
//   8곳의 JSON-LD 가 구글에 url·image 를 `http://localhost:3000/...` 로 광고하고 있었다.
//   기준 주소의 단일 구현은 src/lib/siteUrl.ts — 환경변수가 비면 실주소로 떨어진다.
const getBaseUrl = () => siteUrl();

// 제휴 병원 메인 이미지(/images/hospitals/<slug>/1.jpg)의 절대 URL.
// 폴더 규칙 기반 — 제휴 병원에만 사용(일반 디렉토리 병원은 DB 이미지 유지).
// 사진 미등록 폴더는 404가 날 수 있으나 공유 미리보기 미표시일 뿐 무해.
const partnerFolderImage = (slug) =>
  slug ? `${getBaseUrl()}/images/hospitals/${slug}/1.jpg` : null;

// 요청 언어에 맞는 병원 이름·설명 한 곳에서 계산 — <title>·OG·JSON-LD·breadcrumb가
// 전부 이걸 쓴다(메타만 언어화되고 구조화데이터는 한국어로 남는 드리프트 방지 — #87 리뷰 게이트).
// DB hospitals 테이블엔 name 단일 컬럼(한국어)뿐이라, 같은 slug의 제휴 정적 데이터
// (partnerHospitals, 6개 언어)를 언어화 소스로 겹쳐 쓴다. ko는 DB 원문 우선.
const localizedHospitalText = (hospital, partner, lc) => {
  const name =
    (lc === "ko" ? hospital?.name : pickLocalized(partner?.name, lc)) ||
    hospital?.name ||
    pickLocalized(partner?.name, lc) ||
    partner?.name?.ko ||
    null;
  const description =
    (lc === "ko"
      ? hospital?.description || pickLocalized(partner?.description, lc)
      : pickLocalized(partner?.description, lc) || hospital?.description) ||
    partner?.description?.ko ||
    "Explore this healwith partner hospital in Korea.";
  return { name, description };
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { locale } = await getRequestLocale();
  const lc = locale || "en";
  const partner = (await getMergedContentFiles()).hospitals[slug] || null;

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug, lc)) ||
      (isUuid(slug) ? await getHospitalById(slug, lc) : null)
    : null;

  // canonical·og:url 은 같은 값이어야 한다. localeAlternates() 가 언어 코드(/en/…)를 붙여준다
  // — 예전엔 og:url 에 언어 없는 상대경로를 써서 canonical 과 어긋났다(2026-08-28 실측).
  const hospitalAlt = (await localeAlternates()) || { canonical: `/hospitals/${slug}` };

  // Fallback to static partner data if not in DB
  if (!hospital) {
    if (partner) {
      const { name, description } = localizedHospitalText(null, partner, lc);
      const ogImg = partnerFolderImage(slug);
      const ogImages = ogImg ? [{ url: ogImg }] : undefined;
      return {
        title: name,
        description,
        alternates: hospitalAlt,
        openGraph: { title: name, description, type: "article", images: ogImages, url: hospitalAlt.canonical, ...ogLocaleFields(lc) },
        twitter: ogImages ? { card: "summary_large_image", title: name, description, images: [ogImg] } : undefined,
      };
    }
    // 없는 slug는 메타 단계에서도 notFound() (이중 방어). 상태코드 404의 진짜 조건은 이 라우트
    // 위에 loading.jsx 가 없는 것 — 경계가 있으면 어디서 불러도 200으로 굳음(POSTMORTEMS #87).
    notFound();
  }

  const { name, description } = localizedHospitalText(hospital, partner, lc);
  const canonical = `/hospitals/${hospital.slug || slug}`;
  const dbAlt = (await localeAlternates()) || { canonical };
  const folderOg = hospital.is_partner ? partnerFolderImage(hospital.slug || slug) : null;
  const ogImages = folderOg
    ? [{ url: folderOg }]
    : Array.isArray(hospital.images) && hospital.images.length > 0
      ? [{ url: hospital.images[0] }]
      : undefined;
  return {
    title: name,
    description,
    alternates: dbAlt,
    openGraph: {
      title: name,
      description,
      url: dbAlt.canonical,
      type: "article",
      images: ogImages,
      ...ogLocaleFields(lc),
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title: name,
      description,
      images: ogImages ? ogImages.map((img) => img.url) : undefined,
    },
  };
}

/**
 * 질문-답변 표식(FAQPage) — 화면의 「자주 묻는 질문」 칸에 실제로 뜨는 것과 같은 소스를 쓴다.
 * (화면도 resolveHospitalFaq 를 부른다 — 한쪽만 고쳐져 표식과 화면이 어긋나는 일을 막으려고 함수를 나눠 뒀다.)
 */
function hospitalFaqLd(dbFaq, lang) {
  const items = resolveHospitalFaq(dbFaq, lang);
  if (!Array.isArray(items) || items.length === 0) return null;
  const mapped = items
    .map((f) => ({
      q: f?.question ?? f?.q,
      a: f?.answer ?? f?.a,
    }))
    .filter((f) => f.q && f.a);
  if (mapped.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: mapped.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function HospitalDetailPage({ params, searchParams }) {
  const { slug } = await params;

  if (slug && isUuid(slug)) {
    const resolvedSlug = await getHospitalSlugById(slug);
    // 옛 주소(id)로 들어와도 꼬리표(?utm_source=… 등)를 잃지 않게 넘긴다.
    if (resolvedSlug) redirect(withQuery(`/hospitals/${resolvedSlug}`, await searchParams));
  }

  const { locale } = await getRequestLocale();
  const lc = locale || "en";
  const partner = (await getMergedContentFiles()).hospitals[slug] || null;

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug, lc)) ||
      (isUuid(slug) ? await getHospitalById(slug, lc) : null)
    : null;

  // If in DB → render normally (original flow with full DB data)
  if (hospital) {
    const { name, description } = localizedHospitalText(hospital, partner, lc);
    const baseUrl = getBaseUrl();
    // canonical(=alternates)이 /{언어}/hospitals/… 이므로 구조화데이터도 같은 주소를 쓴다
    // (예전엔 언어 없는 맨 주소라 308 로 튕기는 곳을 엔티티 url 로 가리키고 있었다).
    const canonical = `${baseUrl}${locale ? `/${locale}` : ""}/hospitals/${hospital.slug || slug}`;
    const folderOg = hospital.is_partner ? partnerFolderImage(hospital.slug || slug) : null;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name,
      description,
      image: folderOg
        ? [folderOg]
        : Array.isArray(hospital.images) && hospital.images.length > 0
          ? hospital.images
          : undefined,
      url: canonical,
      areaServed: "KR",
      // ⚠️ 리뷰 «수»가 없으면 별점 자체를 내보내지 않는다.
      //   구글은 AggregateRating 에 ratingCount/reviewCount 중 하나를 요구하고, 없으면
      //   「리뷰 스니펫 구조화된 데이터 문제」로 거부한다(2026-09-06 Search Console 경고).
      //   예전 코드는 reviewCount 를 `|| undefined` 로 떨어뜨려 **별점만 남은 조각**을 보냈다.
<<<<<<< Updated upstream
      //
      // 🔑 짝은 `ratingCount` 다 — `reviewsCount` 가 아니다(2026-09-09 독립 리뷰가 잡음).
      //   `src/lib/mapper.js` 의 resolveRating() 이 별점과 «그 별점을 만든 개수»를 함께 돌려주고,
      //   그게 rating·ratingCount 다. 반면 reviewsCount 는 DB `reviews_count` 원본이고
      //   9개 병원 전부 0 이라, 그걸 조건으로 쓰면 **이 분기가 영원히 안 걸린다.**
      //   화면(`HospitalDetailLegacyClient`)도 「별점 (ratingCount)」로 그린다 — 같은 짝을 써야
      //   «보이는 것»과 «구글에 보내는 것»이 어긋나지 않는다.
      //
      // 🛑 개수를 지어내서 채우지 마라. 근거는 external_ratings.google_reviews 의 실제 항목이다.
      //   ⚠️ 다만 resolveRating() 은 그중 «4점 이상 + 본문 있음 + 숨김 아님»만 골라 평균낸다.
      //      선별된 평균을 구조화 데이터로 내보내는 것이 옳은지는 따로 볼 문제다(KNOWN_ISSUES).
      aggregateRating:
        hospital.rating && Number(hospital.ratingCount) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: hospital.rating,
              reviewCount: Number(hospital.ratingCount),
=======
      //   🛑 개수를 지어내서 채우지 마라 — 리뷰가 0건인데 별 5개를 광고하는 꼴이 된다.
      //   (2026-09-09 실측: DB 의 rating·reviews_count 는 9개 병원 전부 null/0 인데
      //    실서비스 JSON-LD 에는 ratingValue 5·4.5 가 나가고 있었다. 그 값의 출처는
      //    아직 못 밝혔다 — 이 가드는 출처와 무관하게 «근거 없는 별점»을 막는다.)
      aggregateRating:
        hospital.rating && Number(hospital.reviewsCount) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: hospital.rating,
              reviewCount: Number(hospital.reviewsCount),
>>>>>>> Stashed changes
            }
          : undefined,
    };
    const breadcrumb = breadcrumbLd(
      [
        { name: "Home", url: "/" },
        { name: "Hospitals", url: "/hospitals" },
        { name, url: `/hospitals/${hospital.slug || slug}` },
      ],
      locale,
    );
    return (
      <>
        <script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([jsonLd, breadcrumb, hospitalFaqLd(hospital.faq, lc)].filter(Boolean)),
          }}
        />
        {/* 서버가 이미 조회한 걸 그대로 넘긴다 — 안 넘기면 첫 화면이 「불러오는 중」이라
            JS 안 돌리는 검색·AI 로봇이 본문을 통째로 못 읽는다. 치료 목록·리뷰는
            화면 쪽이 이어서 가져온다(초기자료가 있어도 조회를 건너뛰지 않게 고쳤다). */}
        <HospitalDetailClient id={slug} initialData={hospital} />
      </>
    );
  }

  // Fallback: static partner data (university hospitals not in DB)
  if (partner) {
    const { name, description } = localizedHospitalText(null, partner, lc);
    const initialData = convertPartnerToInitialData(partner);
    const baseUrl = getBaseUrl();
    const folderOg = partnerFolderImage(slug);
    const localizedAddress = pickLocalized(partner.address, lc) || partner.address?.ko;
    const partnerJsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name,
      description,
      image: folderOg ? [folderOg] : undefined,
      url: `${baseUrl}${locale ? `/${locale}` : ""}/hospitals/${slug}`,
      areaServed: "KR",
      ...(localizedAddress
        ? { address: { "@type": "PostalAddress", streetAddress: localizedAddress, addressCountry: "KR" } }
        : {}),
      ...(partner.phone ? { telephone: partner.phone } : {}),
    };
    const partnerBreadcrumb = breadcrumbLd(
      [
        { name: "Home", url: "/" },
        { name: "Hospitals", url: "/hospitals" },
        { name, url: `/hospitals/${slug}` },
      ],
      locale,
    );
    return (
      <>
        <script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              [partnerJsonLd, partnerBreadcrumb, hospitalFaqLd(initialData?.faq, lc)].filter(Boolean)
            ),
          }}
        />
        <HospitalDetailClient id={slug} initialData={initialData} />
      </>
    );
  }

  notFound();
}
