import { cookies } from "next/headers";
import ContactClient from "./_client/ContactClient";
import ContactPremium from "./ContactPremium";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Contact Us | HEALO",
  description:
    "Get in touch with HEALO for medical concierge inquiries, partnership opportunities, or general questions.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <ContactClient /> : <ContactPremium />;
}
