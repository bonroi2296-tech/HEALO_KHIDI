import AboutClient from "./_client/AboutClient";

export const metadata = {
  title: "About HEALO | AI Medical Concierge",
  description:
    "HEALO connects global patients with trusted hospitals and clinics in Korea through AI-powered medical concierge and matching services.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutClient />;
}
