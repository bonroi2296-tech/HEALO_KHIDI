import RebookingClient from "./RebookingClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
// ⚠️ 옛 값에 있던 `alternates: { canonical: "/patient/rebooking" }` 은 «뗐다».
//    robots.index=false 와 canonical 을 같이 선언한 상태였는데, 그건 구글이 피하라는 조합이고
//    (같은 판단의 근거는 app/claim/[token]/page.jsx 주석) /patient 는 proxy.ts:362 가 로그인으로
//    막는 구역이라 색인 대상 자체가 아니다. 지금의 null 은 그 상속을 끊는 안전벨트다.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientRebooking.title", "seo.patientRebooking.desc");
}

export default function PatientRebookingPage() {
  return <RebookingClient />;
}
