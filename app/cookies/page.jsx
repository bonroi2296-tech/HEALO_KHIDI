import CookiePolicyClient from "./CookiePolicyClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 검색결과에 뜨는 제목·설명은 요청 언어로 (러·카 환자가 구글에서 보는 첫 줄).
export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.cookies.title", "seo.cookies.desc");
}

const baseMeta = {
  title: "Cookie Policy",
  description: "Learn about how healwith uses cookies.",
};

export default function CookiePolicyPage() {
  return <CookiePolicyClient />;
}
