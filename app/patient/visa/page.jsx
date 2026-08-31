import VisaHubClient from "./VisaHubClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// 비자는 러·카 환자가 가장 자주 되짚어 보는 화면이라 탭을 여러 개 띄운다 — 탭 제목이 영어면
// 「내 탭이 어느 것인지」부터 못 찾는다.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientVisa.title", "seo.patientVisa.desc");
}

export default function PatientVisaPage() {
  return <VisaHubClient />;
}
