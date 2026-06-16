import { cookies } from "next/headers";
import TermsOfServiceClient from "./TermsOfServiceClient";
import TermsOfServiceClientLegacy from "./TermsOfServiceClientLegacy";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Terms of Service | healwith",
  description:
    "Terms and conditions for using healwith's AI medical concierge and hospital matching services.",
  alternates: { canonical: "/terms" },
};

export default async function TermsOfServicePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <TermsOfServiceClientLegacy /> : <TermsOfServiceClient />;
}
