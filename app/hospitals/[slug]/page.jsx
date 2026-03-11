import Script from "next/script";
import { notFound, redirect } from "next/navigation";
import {
  getHospitalById,
  getHospitalBySlug,
  getHospitalSlugById,
} from "../../../src/lib/data/hospitals";
import HospitalDetailClient from "./HospitalDetailClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;
  if (!hospital) return {};
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

export default async function HospitalDetailPage({ params }) {
  const { slug } = await params;
  if (slug && isUuid(slug)) {
    const resolvedSlug = await getHospitalSlugById(slug);
    if (resolvedSlug) redirect(`/hospitals/${resolvedSlug}`);
  }
  const hospital = slug
    ? (await getHospitalBySlug(slug)) ||
      (isUuid(slug) ? await getHospitalById(slug) : null)
    : null;
  if (!hospital) notFound();
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
  return (
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
