import { cookies } from "next/headers";
import AboutClient from "./_client/AboutClient";
import AboutPremium from "./AboutPremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "About HEALO | AI Medical Concierge",
  description:
    "HEALO connects global patients with trusted hospitals and clinics in Korea through AI-powered medical concierge and matching services.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <AboutClient /> : <AboutPremium />;
}
