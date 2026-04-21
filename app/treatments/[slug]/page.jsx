import Script from "next/script";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "../../../src/lib/designMode";
import {
  getTreatmentById,
  getTreatmentBySlug,
  getTreatmentSlugById,
} from "../../../src/lib/data/treatments";
import TreatmentDetailClient from "./TreatmentDetailClient";
import CancerDetailClient from "./CancerDetailClient";
import {
  CANCER_DETAILS,
  CANCER_IMAGES,
} from "../../../src/lib/data/immuneCancerDetails";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 암종 slug 목록
const CANCER_SLUGS = ["female", "digest", "liver", "lung", "thyroid", "etc"];

const isUuid = (value) => UUID_REGEX.test(String(value || ""));
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// 암종 페이지 정적 사전 생성
export async function generateStaticParams() {
  return CANCER_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  // 암종 상세 페이지 메타
  if (CANCER_SLUGS.includes(slug)) {
    const cancer = CANCER_DETAILS[slug];
    if (!cancer) return {};
    const title = `${cancer.title.ko} — 면력한방병원 통합 면역치료 | HEALO`;
    const description = cancer.intro.ko.slice(0, 160);
    const ogImg = CANCER_IMAGES.healGraph;
    return {
      title,
      description,
      alternates: {
        canonical: `/treatments/${slug}`,
        languages: {
          "x-default": `${getBaseUrl()}/treatments/${slug}`,
          ko: `${getBaseUrl()}/treatments/${slug}?lang=ko`,
          en: `${getBaseUrl()}/treatments/${slug}?lang=en`,
          ru: `${getBaseUrl()}/treatments/${slug}?lang=ru`,
        },
      },
      openGraph: {
        title,
        description,
        url: `/treatments/${slug}`,
        type: "article",
        images: [{ url: ogImg }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImg],
      },
    };
  }

  // 기존 DB 치료 메타
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

export default async function TreatmentDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });

  // ── 암종 페이지 분기 ────────────────────────────────
  if (CANCER_SLUGS.includes(slug)) {
    const cancer = CANCER_DETAILS[slug];
    if (!cancer) notFound();

    const baseUrl = getBaseUrl();
    // MedicalCondition JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MedicalCondition",
      name: cancer.title.ko,
      alternateName: [cancer.title.en, cancer.title.ru].filter(Boolean),
      description: cancer.intro.ko,
      possibleTreatment: [
        "싸이모신α1 요법",
        "미슬토 요법",
        "NK세포치료제",
        "고주파온열암치료",
        "림프도수 마사지",
        "셀레늄 요법",
        "고농도 비타민 요법",
        "면역플러스 (황기 부정단)",
      ],
      relevantSpecialty: {
        "@type": "MedicalSpecialty",
        name: "Oncology",
      },
      associatedAnatomy: {
        "@type": "AnatomicalStructure",
        name: cancer.title.en,
      },
    };

    const content = (
      <>
        <Script
          id="cancer-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CancerDetailClient slug={slug} />
      </>
    );

    // CancerDetailClient는 자체 Nav/Footer 포함이므로 PageShell 없이 반환
    return content;
  }

  // ── 기존 DB 치료 페이지 ─────────────────────────────
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
  const content = (
    <>
      <Script
        id="treatment-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TreatmentDetailClient id={slug} />
    </>
  );
  if (mode === "legacy") return content;
  return (
    <PageShell current="treatments" noHero>
      {content}
    </PageShell>
  );
}
