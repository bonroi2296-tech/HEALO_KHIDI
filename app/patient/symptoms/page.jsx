import SymptomsClient from "./SymptomsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)은 app/patient/page.jsx 주석 참조.
// base 를 인라인 객체가 아니라 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientSymptoms.title", "seo.patientSymptoms.desc");
}

export default function SymptomsPage() {
  return <SymptomsClient />;
}
