import TermsOfServiceClient from "./TermsOfServiceClient";
import TermsOfServiceClientLegacy from "./TermsOfServiceClientLegacy";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Terms of Service | HEALO",
  description:
    "Terms and conditions for using HEALO's AI medical concierge and hospital matching services.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  const mode = getServerDesignMode();
  return mode === "legacy" ? <TermsOfServiceClientLegacy /> : <TermsOfServiceClient />;
}
