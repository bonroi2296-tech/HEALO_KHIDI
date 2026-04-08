import VisaClient from './VisaClient';

export const metadata = {
  title: "Medical Visa Guide",
  description:
    "Complete guide to Korean medical visas (C-3-3, G-1-10). Required documents checklist, processing times, fees, and embassy information for international patients.",
  keywords: ["Korea medical visa", "C-3-3 visa", "G-1-10 visa", "medical tourism visa"],
  openGraph: {
    title: "Medical Visa Guide | HEALO",
    description: "Complete guide to Korean medical visas with document checklists.",
  },
  twitter: {
    card: "summary",
    title: "Medical Visa Guide | HEALO",
    description: "Korean medical visa guide with required documents and embassy info.",
  },
  alternates: { canonical: "/patient/visa" },
};

export default function PatientVisaPage() {
  return <VisaClient />;
}
