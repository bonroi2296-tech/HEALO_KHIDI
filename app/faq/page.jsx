import FAQClient from "./FAQClient";

export const metadata = {
  title: "FAQ | HEALO — Frequently Asked Questions",
  description:
    "Common questions about HEALO's medical concierge service for international cancer patients — consultation, treatment, visa, payment, and privacy.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | HEALO",
    description: "Everything international patients ask about treatment in Korea.",
  },
};

export default function FAQPage() {
  return <FAQClient />;
}
