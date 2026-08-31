import CostEstimateDetailClient from "./CostEstimateDetailClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// 제목은 고정 문구다 — 견적 금액·환자 정보를 제목에 넣지 마라(탭 제목·공유 미리보기로 새는 자리).
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientEstimateDetail.title", "seo.patientEstimateDetail.desc");
}

export default async function Page({ params }) {
  const { id } = await params;
  return <CostEstimateDetailClient estimateId={id} />;
}
