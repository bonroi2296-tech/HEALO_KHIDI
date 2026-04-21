import ImmuneHospitalClient from "./ImmuneHospitalClient";
import Script from "next/script";

export const metadata = {
  title: "Immune Hospital — 면력한방병원 | HEALO",
  description:
    "Immune Hospital — HEALO's direct partner. Korean Medicine immune care for cancer patients. ITCR 5-principles, 50,000+ cases, chef-led therapeutic meals. 4 branches in Seoul & Gyeonggi.",
  keywords: ["면력한방병원", "Immune Hospital Korea", "Korean Medicine cancer immune therapy", "ITCR protocol", "cancer hospital Seoul"],
  alternates: { canonical: "/hospitals/immune" },
  openGraph: {
    title: "Immune Hospital — Integrated cancer immune care in Korea",
    description:
      "50,000+ cancer patient cases. 5-principle ITCR protocol. Chef-led therapeutic meals. HEALO's direct partner.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Immune Hospital — 면력한방병원 | HEALO",
    description: "50,000+ cancer patient cases. Korean Medicine immune therapy. 4 branches in Seoul & Gyeonggi.",
  },
};

const hospitalJsonLd = {
  "@context": "https://schema.org",
  "@type": "Hospital",
  name: "Immune Hospital (면력한방병원)",
  alternateName: "면력한방병원",
  description:
    "Immune Hospital is HEALO's direct partner specializing in Korean Medicine immune therapy for cancer patients. Operating with the ITCR 5-principle protocol and over 50,000 cancer patient cases.",
  url: "https://khidi.healo.kr/hospitals/immune",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "Seoul",
  },
  medicalSpecialty: ["Oncology", "Korean Medicine", "Integrative Medicine"],
  availableService: [
    { "@type": "MedicalTherapy", name: "ITCR Immune Therapy Protocol" },
    { "@type": "MedicalTherapy", name: "Korean Medicine Immune Care" },
    { "@type": "MedicalTherapy", name: "Therapeutic Meal Program" },
  ],
  numberOfBeds: null,
  parentOrganization: {
    "@type": "Organization",
    name: "HEALO",
    url: "https://khidi.healo.kr",
  },
};

export default function ImmuneHospitalPage() {
  return (
    <>
      <Script
        id="jsonld-immune-hospital"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hospitalJsonLd) }}
      />
      <ImmuneHospitalClient />
    </>
  );
}
