import HomeClient from "./home/HomeClient";
import Script from "next/script";

export const metadata = {
  title: "HEALO | Korea Medical Tourism Concierge",
  description:
    "AI-powered medical concierge connecting international patients with top Korean hospitals. Compare cancer treatments, get free quotes, and receive full concierge support in 6 languages.",
  keywords: [
    "Korea medical tourism",
    "cancer treatment Korea",
    "Korean hospitals",
    "medical concierge",
    "한국 의료관광",
    "медицинский туризм Корея",
  ],
  openGraph: {
    title: "HEALO | Korea Medical Tourism Concierge",
    description:
      "Compare cancer treatments at top Korean hospitals. Free quotes and multilingual concierge service.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEALO | Korea Medical Tourism Concierge",
    description:
      "AI-powered medical concierge for international patients seeking treatment in Korea.",
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: "HEALO",
  description:
    "AI-powered medical concierge connecting international patients with top Korean hospitals for cancer treatment.",
  url: "https://khidi.healo.kr",
  logo: "https://khidi.healo.kr/icons/icon-512x512.png",
  areaServed: {
    "@type": "Country",
    name: "South Korea",
  },
  availableLanguage: [
    { "@type": "Language", name: "Korean" },
    { "@type": "Language", name: "English" },
    { "@type": "Language", name: "Chinese" },
    { "@type": "Language", name: "Japanese" },
    { "@type": "Language", name: "Russian" },
    { "@type": "Language", name: "Kazakh" },
  ],
  medicalSpecialty: [
    "Oncology",
    "Dermatology",
    "PlasticSurgery",
    "Dentistry",
  ],
  serviceType: "Medical Tourism Concierge",
};

export default function HomePage() {
  return (
    <>
      <Script
        id="jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
