import Script from "next/script";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "../../../src/lib/designMode";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "../../../src/lib/data/hospitals";
import { getPartnerHospital, convertPartnerToInitialData } from "../../../src/lib/data/partnerHospitals";
import HospitalDetailClient from "./HospitalDetailClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
      return {
        title: partner.name.en,
        description: partner.description.en,
        alternates: { canonical: `/hospitals/${slug}` },
        openGraph: { title: partner.name.en, description: partner.description.en, type: "article" },
      };
    }
    return {};
  }

  const description =
    hospital.description || "Explore this HEALO partner hospital in Korea.";
  const canonical = `/hospitals/${hospital.slug || slug}`;
  const ogImages =
    Array.isArray(hospital.images) && hospital.images.length > 0
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
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name: hospital.name,
      description:
        hospital.description || "Explore this HEALO partner hospital in Korea.",
      image:
        Array.isArray(hospital.images) && hospital.images.length > 0
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
    return wrapIfPremium(<HospitalDetailClient id={slug} initialData={initialData} />);
  }

  notFound();
}
