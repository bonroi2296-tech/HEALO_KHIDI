import PrivacyPolicyClient from "./PrivacyPolicyClient";
import PrivacyPolicyClientLegacy from "./PrivacyPolicyClientLegacy";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Privacy Policy | HEALO",
  description:
    "How HEALO collects, uses, and protects personal information for medical concierge and hospital matching services.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  const mode = getServerDesignMode();
  return mode === "legacy" ? <PrivacyPolicyClientLegacy /> : <PrivacyPolicyClient />;
}
