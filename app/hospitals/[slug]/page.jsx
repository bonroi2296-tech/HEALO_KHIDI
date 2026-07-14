import { notFound, redirect } from "next/navigation";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "@/lib/data/hospitals";
import { getPartnerHospital, convertPartnerToInitialData } from "@/lib/data/partnerHospitals";
import HospitalDetailClient from "./HospitalDetailClient";
import { localeAlternates, getRequestLocale } from "@/lib/i18n/metadata";
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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { locale } = await getRequestLocale();
  const lc = locale || "en";
  // 제휴 병원 정적 데이터(6개 언어 이름·설명) — DB 병원이어도 같은 slug면 언어화 소스로 쓴다.
  // (DB hospitals 테이블엔 name 단일 컬럼뿐이라 /en·/ru 페이지에 한국어 제목이 나가던 문제 대응.)
  const partner = getPartnerHospital(slug);
  const pick = (obj) => obj?.[lc] || obj?.en || null;

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;

  // Fallback to static partner data if not in DB
  if (!hospital) {
    if (partner) {
      const name = pick(partner.name) || partner.name?.ko;
      const desc = pick(partner.description) || partner.description?.ko;
      const ogImg = partnerFolderImage(slug);
      const ogImages = ogImg ? [{ url: ogImg }] : undefined;
      return {
        title: name,
        description: desc,
        alternates: (await localeAlternates()) || { canonical: `/hospitals/${slug}` },
        openGraph: { title: name, description: desc, type: "article", images: ogImages },
        twitter: ogImages ? { card: "summary_large_image", title: name, description: desc, images: [ogImg] } : undefined,
      };
    }
    // 없는 slug는 메타 단계에서도 notFound() (이중 방어). 상태코드 404의 진짜 조건은 이 라우트
    // 위에 loading.jsx 가 없는 것 — 경계가 있으면 어디서 불러도 200으로 굳음(POSTMORTEMS #86).
    notFound();
  }

  const name =
    (lc === "ko" ? hospital.name : pick(partner?.name)) || hospital.name;
  const description =
    (lc === "ko"
      ? hospital.description
      : pick(partner?.description) || hospital.description) ||
    "Explore this healwith partner hospital in Korea.";
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

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;

  // If in DB → render normally (original flow with full DB data)
  if (hospital) {
    const baseUrl = getBaseUrl();
    const canonical = `${baseUrl}/hospitals/${hospital.slug || slug}`;
    const folderOg = hospital.is_partner ? partnerFolderImage(hospital.slug || slug) : null;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name: hospital.name,
      description:
        hospital.description || "Explore this healwith partner hospital in Korea.",
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
      { name: hospital.name, url: `/hospitals/${hospital.slug || slug}` },
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
  const partner = getPartnerHospital(slug);
  if (partner) {
    const initialData = convertPartnerToInitialData(partner);
    const baseUrl = getBaseUrl();
    const folderOg = partnerFolderImage(slug);
    const partnerJsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name: partner.name?.en || partner.name?.ko,
      description: partner.description?.en || partner.description?.ko || "Explore this healwith partner hospital in Korea.",
      image: folderOg ? [folderOg] : undefined,
      url: `${baseUrl}/hospitals/${slug}`,
      areaServed: "KR",
      ...(partner.address?.en || partner.address?.ko
        ? { address: { "@type": "PostalAddress", streetAddress: partner.address?.en || partner.address?.ko, addressCountry: "KR" } }
        : {}),
      ...(partner.phone ? { telephone: partner.phone } : {}),
    };
    const partnerBreadcrumb = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Hospitals", url: "/hospitals" },
      { name: partner.name?.en || partner.name?.ko, url: `/hospitals/${slug}` },
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
