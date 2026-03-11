import Script from "next/script";
import { notFound, redirect } from "next/navigation";
import {
  getTreatmentById,
  getTreatmentBySlug,
  getTreatmentSlugById,
} from "../../../src/lib/data/treatments";
import TreatmentDetailClient from "./TreatmentDetailClient";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const treatment = slug
    ? (await getTreatmentBySlug(slug)) ||
      (isUuid(slug) ? await getTreatmentById(slug) : null)
    : null;
  if (!treatment) return {};
  const description =
    treatment.desc ||
    treatment.fullDescription ||
    "Explore this HEALO treatment in Korea.";
  const canonical = `/treatments/${treatment.slug || slug}`;
  const ogImages =
    Array.isArray(treatment.images) && treatment.images.length > 0
      ? [{ url: treatment.images[0] }]
      : undefined;
  return {
    title: treatment.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: treatment.title,
      description,
      url: canonical,
      type: "article",
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title: treatment.title,
      description,
      images: ogImages ? ogImages.map((img) => img.url) : undefined,
    },
  };
}

export default async function TreatmentDetailPage({ params }) {
  const { slug } = await params;
  if (slug && isUuid(slug)) {
    const resolvedSlug = await getTreatmentSlugById(slug);
    if (resolvedSlug) redirect(`/treatments/${resolvedSlug}`);
  }
  const treatment = slug
    ? (await getTreatmentBySlug(slug)) ||
      (isUuid(slug) ? await getTreatmentById(slug) : null)
    : null;
  if (!treatment) notFound();
  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/treatments/${treatment.slug || slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: treatment.title,
    description:
      treatment.desc ||
      treatment.fullDescription ||
      "Explore this HEALO treatment in Korea.",
    image:
      Array.isArray(treatment.images) && treatment.images.length > 0
        ? treatment.images
        : undefined,
    url: canonical,
    provider: treatment.hospitalName
      ? {
          "@type": "MedicalOrganization",
          name: treatment.hospitalName,
          url: treatment.hospitalSlug
            ? `${baseUrl}/hospitals/${treatment.hospitalSlug}`
            : undefined,
          areaServed: "KR",
        }
      : undefined,
    areaServed: "KR",
    priceRange: treatment.price || undefined,
  };
  return (
    <>
      <Script
        id="treatment-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TreatmentDetailClient id={slug} />
    </>
  );
}
