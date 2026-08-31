import DocumentsClient from "./DocumentsClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)은 app/patient/page.jsx 주석 참조.
export async function generateMetadata() {
  return localizedMeta(
    { robots: { index: false, follow: false }, alternates: null },
    "seo.patientDocs.title",
    "seo.patientDocs.desc"
  );
}

export default function DocumentsPage() {
  return <DocumentsClient />;
}
