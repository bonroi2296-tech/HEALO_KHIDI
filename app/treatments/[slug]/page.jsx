import Script from "next/script";
import { notFound, redirect } from "next/navigation";
import {
  getTreatmentById,
  getTreatmentBySlug,
  getTreatmentSlugById,
} from "@/lib/data/treatments";
import TreatmentDetailClient from "./TreatmentDetailClient";
import CancerDetailClient from "./CancerDetailClient";
import {
  CANCER_DETAILS,
  CANCER_IMAGES,
} from "@/lib/data/immuneCancerDetails";
import { localeAlternates, getRequestLocale } from "@/lib/i18n/metadata";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 암종 slug 목록
const CANCER_SLUGS = ["female", "digest", "liver", "lung", "thyroid", "etc"];

// 암종별 고의도 검색어(러·카자흐 Yandex) — HEALwith_keywords 광고시트 §"По типу рака" 정렬.
// 격변화 깨짐 방지 위해 시트의 완전한 구(句) 그대로 사용. 암종별 = 일반어보다 전환↑.
const CANCER_KEYWORDS = {
  female: [
    "лечение рака груди в Корее",
    "лечение рака матки в Корее",
    "лечение рака яичников в Корее",
    "Кореяда сүт безі обырын емдеу",
  ],
  digest: [
    "лечение рака желудка в Корее",
    "лечение колоректального рака в Корее",
    "Кореяда асқазан обырын емдеу",
  ],
  liver: [
    "лечение рака печени в Корее",
    "лечение рака поджелудочной железы в Корее",
    "Кореяда бауыр обырын емдеу",
  ],
  lung: [
    "лечение рака лёгких в Корее",
    "Кореяда өкпе обырын емдеу",
  ],
  thyroid: [
    "лечение рака щитовидной железы в Корее",
    "Кореяда қалқанша без обырын емдеу",
  ],
  etc: [],
};

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
    const { locale } = await getRequestLocale();
    const lc = locale || "en";
    const name = cancer.title?.[lc] || cancer.title?.en || cancer.title?.ko;
    const title = name; // 루트 template "%s | healwith"가 접미사 자동 추가
    const description = (cancer.intro?.[lc] || cancer.intro?.en || cancer.intro?.ko || "").slice(0, 160);
    const ogImg = CANCER_IMAGES.healGraph;
    // 전환 의도 키워드(가격·비자·이동) — GROWTH_PLAN 리서치 기반. 문법 안전한 일반형만
    // (암종명 보간은 러시아어 격변화가 깨질 수 있어 생략). 카자흐=Google, 러시아=Yandex 타겟.
    const keywords = [
      // 암종별 고의도(전환↑) — 시트 §"По типу рака"
      ...(CANCER_KEYWORDS[slug] || []),
      // 세컨드오피니언 = 진입장벽 낮은 메인 훅(시트 §전략 3)
      "второе мнение онколога",
      "второе мнение при раке",
      // 가격·비자·이동(구매의도)
      "лечение рака в Корее цена",
      "стоимость лечения рака в Корее",
      "лечение рака в Корее без визы",
      "лечение рака в Корее из Алматы",
      "медицинская виза в Корею",
      "Кореяда рак емдеу бағасы",
      "cancer treatment Korea cost",
      "medical visa South Korea",
      "한국 암 치료 비용",
    ];
    return {
      title,
      description,
      keywords,
      alternates: (await localeAlternates()) || undefined,
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
    "Explore this healwith treatment in Korea.";
  const canonical = `/treatments/${treatment.slug || slug}`;
  const ogImages =
    Array.isArray(treatment.images) && treatment.images.length > 0
      ? [{ url: treatment.images[0] }]
      : undefined;
  return {
    title: treatment.title,
    description,
    alternates: (await localeAlternates()) || { canonical },
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

  // ── 암종 페이지 분기 ────────────────────────────────
  if (CANCER_SLUGS.includes(slug)) {
    const cancer = CANCER_DETAILS[slug];
    if (!cancer) notFound();

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
      "Explore this healwith treatment in Korea.",
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
  return content;
}
