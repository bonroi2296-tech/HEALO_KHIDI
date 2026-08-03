import ContactClient from "./_client/ContactClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.contact.title", "seo.contact.desc");
}

const baseMeta = {
  title: "Contact Us",
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

export default function ContactPage() {
  return <ContactClient />;
}
