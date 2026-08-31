import PatientChatClient from "./PatientChatClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// ⚠️ ru·kz 값은 「AI」를 라틴으로 쓰면 안 된다(용어집 term.ai = ИИ / ЖИ, locked).
//    사전 쪽에서 이미 그렇게 넣었으니 여기서 문자열을 되살리지 마라.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientChat.title", "seo.patientChat.desc");
}

export default function PatientChatPage() {
  return <PatientChatClient />;
}
