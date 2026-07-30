import TermsOfServiceClientLegacy from "./TermsOfServiceClientLegacy";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.terms.title", "seo.terms.desc");
}

const baseMeta = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using healwith's AI medical concierge and hospital matching services.",
};

export default function TermsOfServicePage() {
  return <TermsOfServiceClientLegacy />;
}
