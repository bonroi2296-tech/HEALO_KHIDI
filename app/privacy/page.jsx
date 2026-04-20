import { cookies } from "next/headers";
import PrivacyPolicyClient from "./PrivacyPolicyClient";
import PrivacyPolicyClientLegacy from "./PrivacyPolicyClientLegacy";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Privacy Policy | HEALO",
  description:
    "How HEALO collects, uses, and protects personal information for medical concierge and hospital matching services.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPolicyPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <PrivacyPolicyClientLegacy /> : <PrivacyPolicyClient />;
}
