import VisaApplicationDetailClient from "./VisaApplicationDetailClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// 제목은 고정 문구다 — 여권번호·신청 상태 같은 개인정보를 제목에 끼워 넣지 마라.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientVisaAppDetail.title", "seo.patientVisaAppDetail.desc");
}

export default async function PatientVisaApplicationDetailPage({ params }) {
  const { id } = await params;
  return <VisaApplicationDetailClient applicationId={id} />;
}
