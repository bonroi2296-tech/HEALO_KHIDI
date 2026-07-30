import PrivacyPolicyClientLegacy from "./PrivacyPolicyClientLegacy";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.privacy.title", "seo.privacy.desc");
}

const baseMeta = {
  title: "Privacy Policy",
  description:
    "How healwith collects, uses, and protects personal information for medical concierge and hospital matching services.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientLegacy />;
}
