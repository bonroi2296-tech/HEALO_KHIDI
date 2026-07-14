import { notFound, redirect } from "next/navigation";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "@/lib/data/hospitals";
import { getPartnerHospital, convertPartnerToInitialData } from "@/lib/data/partnerHospitals";
import HospitalDetailClient from "./HospitalDetailClient";
import { localeAlternates, getRequestLocale, pickLocalized } from "@/lib/i18n/metadata";
import { breadcrumbLd } from "@/lib/seo/structuredData";

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
  const partner = getPartnerHospital(slug);

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;

  // Fallback to static partner data if not in DB
  if (!hospital) {
    if (partner) {
      const { name, description } = localizedHospitalText(null, partner, lc);
      const ogImg = partnerFolderImage(slug);
      const ogImages = ogImg ? [{ url: ogImg }] : undefined;
      return {
        title: name,
        description,
        alternates: (await localeAlternates()) || { canonical: `/hospitals/${slug}` },
        openGraph: { title: name, description, type: "article", images: ogImages },
        twitter: ogImages ? { card: "summary_large_image", title: name, description, images: [ogImg] } : undefined,
      };
    }
    // 없는 slug는 메타 단계에서도 notFound() (이중 방어). 상태코드 404의 진짜 조건은 이 라우트
    // 위에 loading.jsx 가 없는 것 — 경계가 있으면 어디서 불러도 200으로 굳음(POSTMORTEMS #87).
    notFound();
  }

  const { name, description } = localizedHospitalText(hospital, partner, lc);
  const canonical = `/hospitals/${hospital.slug || slug}`;
  const folderOg = hospital.is_partner ? partnerFolderImage(hospital.slug || slug) : null;
  const ogImages = folderOg
    ? [{ url: folderOg }]
    : Array.isArray(hospital.images) && hospital.images.length > 0
      ? [{ url: hospital.images[0] }]
      : undefined;
  return {
    title: name,
    description,
    alternates: (await localeAlternates()) || { canonical },
    openGraph: {
      title: name,
      description,
      url: canonical,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title: name,
      description,
      images: ogImages ? ogImages.map((img) => img.url) : undefined,
    },
  };
}

export default async function HospitalDetailPage({ params }) {
  const { slug } = await params;

  if (slug && isUuid(slug)) {
    const resolvedSlug = await getHospitalSlugById(slug);
    if (resolvedSlug) redirect(`/hospitals/${resolvedSlug}`);
  }

  const { locale } = await getRequestLocale();
  const lc = locale || "en";
  const partner = getPartnerHospital(slug);

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;

  // If in DB → render normally (original flow with full DB data)
  if (hospital) {
    const { name, description } = localizedHospitalText(hospital, partner, lc);
    const baseUrl = getBaseUrl();
    const canonical = `${baseUrl}/hospitals/${hospital.slug || slug}`;
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
    const breadcrumb = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Hospitals", url: "/hospitals" },
      { name, url: `/hospitals/${hospital.slug || slug}` },
    ]);
    return (
      <>
        <script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
        />
        <HospitalDetailClient id={slug} />
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
      url: `${baseUrl}/hospitals/${slug}`,
      areaServed: "KR",
      ...(localizedAddress
        ? { address: { "@type": "PostalAddress", streetAddress: localizedAddress, addressCountry: "KR" } }
        : {}),
      ...(partner.phone ? { telephone: partner.phone } : {}),
    };
    const partnerBreadcrumb = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Hospitals", url: "/hospitals" },
      { name, url: `/hospitals/${slug}` },
    ]);
    return (
      <>
        <script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([partnerJsonLd, partnerBreadcrumb]) }}
        />
        <HospitalDetailClient id={slug} initialData={initialData} />
      </>
    );
  }

  notFound();
}
