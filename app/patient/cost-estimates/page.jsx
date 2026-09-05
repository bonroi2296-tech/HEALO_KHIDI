import CostEstimatesListClient from "./CostEstimatesListClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// 옛 제목은 "My Cost Estimates · healwith" 였다 — 값 안의 브랜드 표기는 「| healwith」로 통일
// (사전 seo.* 관례. 루트 template 은 title:{absolute} 라 안 붙는다).
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientEstimates.title", "seo.patientEstimates.desc");
}

export default function PatientCostEstimatesPage() {
  return <CostEstimatesListClient />;
}
