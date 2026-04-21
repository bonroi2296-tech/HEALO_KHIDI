import Script from "next/script";
import StoriesClient from "./StoriesClient";
import { STORIES } from "../../src/lib/stories/storiesData";

export const metadata = {
  title: "Patient Stories | HEALO",
  description:
    "Real stories from international cancer patients who received treatment in Korea through HEALO. Consented and published with patient approval.",
  keywords: ["cancer patient stories", "Korea cancer treatment testimonials", "medical tourism Korea reviews", "암환자 후기"],
  alternates: { canonical: "/stories" },
  openGraph: {
    title: "Patient Stories | HEALO",
    description: "Real journeys from international cancer patients treated in Korea — consented and published with patient approval.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Patient Stories | HEALO",
    description: "Real stories from international cancer patients who received treatment in Korea.",
  },
};

// Schema.org Review JSON-LD — 각 환자 스토리를 Review 로 표현해 검색결과에서
// ⭐ 리치 스니펫 노출. Google 은 MedicalOrganization 리뷰를 특히 잘 파싱.
const reviewsJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "HEALO",
  url: "https://khidi.healo.kr",
  medicalSpecialty: "Oncology",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: STORIES.length,
    bestRating: "5",
    worstRating: "1",
  },
  review: STORIES.map((s) => ({
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    author: {
      "@type": "Person",
      name: s.displayName?.en || s.displayName?.ko || "Anonymous",
      nationality: s.country?.en || undefined,
    },
    reviewBody: s.quote?.en || s.quote?.ko || "",
    datePublished: s.consentDate,
    itemReviewed: {
      "@type": "MedicalBusiness",
      name: s.hospitalName || "HEALO Partner Hospital",
    },
    // 의료법·윤리: 리뷰는 환자 동의 기반 (consentDate 로 증빙)
    publisher: { "@type": "Organization", name: "HEALO" },
  })),
};

export default function StoriesPage() {
  return (
    <>
      <Script
        id="jsonld-stories-reviews"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd) }}
      />
      <StoriesClient />
    </>
  );
}
