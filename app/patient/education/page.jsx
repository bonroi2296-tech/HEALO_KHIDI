import { redirect } from 'next/navigation';
import { localizedMeta } from "@/lib/i18n/metadata";

// 언어화 경위·함정(«/patient 는 x-locale 이 안 붙는다»)과 base 를 인라인 객체가 아니라
// 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
//
// ⚠️ 정직하게: 이 화면은 아래에서 곧바로 /education 으로 redirect 하므로 **이 제목이 실제로
//    브라우저 탭에 뜨는 일은 사실상 없다**(본문 없는 리다이렉트 응답이라 <head> 가 안 나간다).
//    그래도 고치는 이유는 두 가지다 — ①리다이렉트를 걷어내는 날 영어 제목이 조용히 되살아난다
//    ②/patient 화면 15개 중 하나만 정적 영어로 남으면 다음 사람이 그걸 「허용된 패턴」으로 읽는다.
//    실제 화면 제목은 /education(app/education/page.jsx)이 자기 metadata 로 낸다.
// ⚠️ alternates 는 «일부러» 옛 값 그대로 둔다. 여기서 null 로 바꾸면 「고쳤다」고 말할 수 있을 뿐
//    실제 효과는 확인할 수 없다(리다이렉트라 메타가 안 나감). 손대지 않는 쪽이 정직하다.
const baseMeta = { alternates: { canonical: "/education" } };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.patientEducation.title", "seo.patientEducation.desc");
}

export default function PatientEducationPage() {
  redirect('/education');
}
