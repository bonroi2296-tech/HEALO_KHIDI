import { cookies } from "next/headers";
import PrivacyPolicyClient from "./PrivacyPolicyClient";
import PrivacyPolicyClientLegacy from "./PrivacyPolicyClientLegacy";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Privacy Policy | healwith",
  description:
    "How healwith collects, uses, and protects personal information for medical concierge and hospital matching services.",
};

export default async function PrivacyPolicyPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <PrivacyPolicyClientLegacy /> : <PrivacyPolicyClient />;
}
