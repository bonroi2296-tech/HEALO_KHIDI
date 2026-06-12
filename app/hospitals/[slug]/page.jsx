import Script from "next/script";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "@/lib/designMode";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "@/lib/data/hospitals";
import { getPartnerHospital, convertPartnerToInitialData } from "@/lib/data/partnerHospitals";
import HospitalDetailClient from "./HospitalDetailClient";

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

  // Try DB first
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;

  // Fallback to static partner data if not in DB
  if (!hospital) {
    const partner = getPartnerHospital(slug);
    if (partner) {
      const ogImg = partnerFolderImage(slug);
      const ogImages = ogImg ? [{ url: ogImg }] : undefined;
      return {
        title: partner.name.en,
        description: partner.description.en,
        alternates: { canonical: `/hospitals/${slug}` },
        openGraph: { title: partner.name.en, description: partner.description.en, type: "article", images: ogImages },
        twitter: ogImages ? { card: "summary_large_image", title: partner.name.en, description: partner.description.en, images: [ogImg] } : undefined,
      };
    }
    return {};
  }

  const description =
    hospital.description || "Explore this HEALO partner hospital in Korea.";
  const canonical = `/hospitals/${hospital.slug || slug}`;
  const folderOg = hospital.is_partner ? partnerFolderImage(hospital.slug || slug) : null;
  const ogImages = folderOg
    ? [{ url: folderOg }]
    : Array.isArray(hospital.images) && hospital.images.length > 0
      ? [{ url: hospital.images[0] }]
      : undefined;
  return {
    title: hospital.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: hospital.name,
      description,
      url: canonical,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title: hospital.name,
      description,
      images: ogImages ? ogImages.map((img) => img.url) : undefined,
    },
  };
}

export default async function HospitalDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const wrapIfPremium = (node) =>
    mode === "legacy" ? node : <PageShell current="hospitals" noHero>{node}</PageShell>;

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
        hospital.description || "Explore this HEALO partner hospital in Korea.",
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
    return wrapIfPremium(
      <>
        <Script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
      description: partner.description?.en || partner.description?.ko || "Explore this HEALO partner hospital in Korea.",
      image: folderOg ? [folderOg] : undefined,
      url: `${baseUrl}/hospitals/${slug}`,
      areaServed: "KR",
      ...(partner.address?.en || partner.address?.ko
        ? { address: { "@type": "PostalAddress", streetAddress: partner.address?.en || partner.address?.ko, addressCountry: "KR" } }
        : {}),
      ...(partner.phone ? { telephone: partner.phone } : {}),
    };
    return wrapIfPremium(
      <>
        <Script
          id="hospital-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(partnerJsonLd) }}
        />
        <HospitalDetailClient id={slug} initialData={initialData} />
      </>
    );
  }

  notFound();
}
