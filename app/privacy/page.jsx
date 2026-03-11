import PrivacyPolicyClient from "./PrivacyPolicyClient";

export const metadata = {
  title: "Privacy Policy | HEALO",
  description:
    "How HEALO collects, uses, and protects personal information for medical concierge and hospital matching services.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
