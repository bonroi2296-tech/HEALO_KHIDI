import FAQClient from "./FAQClient";
import Script from "next/script";

export const metadata = {
  title: "FAQ | HEALO — Frequently Asked Questions",
  description:
    "Common questions about HEALO's medical concierge service for international cancer patients — consultation, treatment, visa, payment, and privacy.",
  keywords: ["HEALO FAQ", "Korea medical tourism FAQ", "cancer treatment Korea questions", "medical concierge FAQ"],
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | HEALO",
    description: "Everything international patients ask about treatment in Korea — consultation, visa, payment, and privacy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | HEALO — Frequently Asked Questions",
    description: "Everything international patients ask about cancer treatment in Korea.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I start a consultation with HEALO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can start a consultation by submitting an inquiry through our website. Our concierge team will contact you within 24 hours to guide you through the process.",
      },
    },
    {
      "@type": "Question",
      name: "What languages does HEALO support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HEALO provides real-time interpretation in 6 languages: Korean, English, Russian, Kazakh, Chinese, and Japanese.",
      },
    },
    {
      "@type": "Question",
      name: "Does HEALO help with medical visas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, HEALO assists international patients with Korean medical visa applications, including document preparation and embassy guidance.",
      },
    },
    {
      "@type": "Question",
      name: "What types of cancer treatments are available in Korea?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Korea offers comprehensive cancer care including surgery, chemotherapy, radiation, targeted therapy, immunotherapy, and Korean Medicine immune therapy. HEALO partners with specialized oncology centers and Korean Medicine hospitals.",
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <Script
        id="jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClient />
    </>
  );
}
