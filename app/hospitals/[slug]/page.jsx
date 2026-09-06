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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
      aggregateRating: hospital.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: hospital.rating,
            reviewCount: hospital.reviewsCount || undefined,
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
