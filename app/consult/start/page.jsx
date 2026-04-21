import ConsultWrapper from "./ConsultWrapper";

export const metadata = {
  title: "Start Your Consultation | HEALO — Korea Cancer Treatment",
  description:
    "Begin your free consultation with HEALO's medical concierge team. Connect with Korean oncology specialists, get a treatment plan, and receive support in your language.",
  keywords: ["Korea cancer consultation", "free medical consultation Korea", "oncology second opinion Korea"],
  alternates: { canonical: "/consult/start" },
  openGraph: {
    title: "Start Your Consultation | HEALO",
    description: "Free consultation with Korean oncology specialists. Get a personalized treatment plan in your language.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Your Consultation | HEALO",
    description: "Free consultation with Korean oncology specialists. Get a personalized cancer treatment plan.",
  },
};

export default function ConsultStartPage() {
  return <ConsultWrapper />;
}
