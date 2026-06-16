import { cookies } from "next/headers";
import AboutClient from "./_client/AboutClient";
import AboutPremium from "./AboutPremium";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "About healwith | AI Medical Concierge",
  description:
    "healwith connects global patients with trusted hospitals and clinics in Korea through AI-powered medical concierge and matching services.",
  keywords: ["about healwith", "healwith medical concierge", "Korea medical tourism platform", "KHIDI"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About healwith | AI Medical Concierge",
    description: "healwith connects global cancer patients with trusted Korean hospitals through AI-powered concierge and real-time 6-language interpretation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About healwith | AI Medical Concierge",
    description: "healwith connects global patients with trusted hospitals in Korea through AI-powered medical concierge.",
  },
};

export default async function AboutPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <AboutClient /> : <AboutPremium />;
}
