import VisaApplicationsClient from "./VisaApplicationsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// ⚠️ 여기는 제목만 영어인 게 아니라 description 이 통째로 한국어였다("비자 발급 신청 진행 상태를…").
//    본문(VisaApplicationsClient)은 6개어인데 메타만 그랬다 — 메타는 [한글누출] 가드의 사각이라
//    아무도 안 걸렸다. 정적 문자열로 되돌리지 마라.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientVisaApps.title", "seo.patientVisaApps.desc");
}

export default function PatientVisaApplicationsPage() {
  return <VisaApplicationsClient />;
}
