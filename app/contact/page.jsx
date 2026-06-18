import { cookies } from "next/headers";
import ContactClient from "./_client/ContactClient";
import ContactPremium from "./ContactPremium";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Contact Us | healwith",
  description:
    "Get in touch with healwith for medical concierge inquiries, partnership opportunities, or general questions about cancer treatment in Korea.",
  keywords: ["contact healwith", "Korea medical tourism inquiry", "cancer treatment inquiry Korea"],
  openGraph: {
    title: "Contact Us | healwith",
    description: "Get in touch with healwith for medical concierge inquiries, partnership opportunities, or questions about cancer treatment in Korea.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact Us | healwith",
    description: "Get in touch with healwith for medical concierge inquiries and questions about cancer treatment in Korea.",
  },
};

export default async function ContactPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <ContactClient /> : <ContactPremium />;
}
