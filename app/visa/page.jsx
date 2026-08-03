import VisaClient from "../patient/visa/VisaClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.visa.title", "seo.visa.desc");
}

const baseMeta = {
  title: "Medical Visa Guide",
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
};

export default function PublicVisaPage() {
  return <VisaClient />;
}
