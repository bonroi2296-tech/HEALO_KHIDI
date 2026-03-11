import TermsOfServiceClient from "./TermsOfServiceClient";

export const metadata = {
  title: "Terms of Service | HEALO",
  description:
    "Terms and conditions for using HEALO's AI medical concierge and hospital matching services.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />;
}
