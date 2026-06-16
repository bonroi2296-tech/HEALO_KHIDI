import { cookies } from "next/headers";
import VisaClient from "../patient/visa/VisaClient";
import VisaClientPremium from "../patient/visa/VisaClientPremium";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Medical Visa Guide | healwith",
  description:
    "Complete guide to Korean medical visas (C-3-3, G-1-10). Required documents checklist, processing times, fees, and embassy information for international patients.",
  keywords: ["Korea medical visa", "C-3-3 visa", "G-1-10 visa", "medical tourism visa"],
  openGraph: {
    title: "Medical Visa Guide | healwith",
    description: "Complete guide to Korean medical visas with document checklists.",
  },
  twitter: {
    card: "summary",
    title: "Medical Visa Guide | healwith",
    description: "Korean medical visa guide with required documents and embassy info.",
  },
  alternates: { canonical: "/visa" },
};

export default async function PublicVisaPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <VisaClient /> : <VisaClientPremium />;
}
