import { localizedMeta } from "@/lib/i18n/metadata";

// 화상상담 방(/consultation/{id})의 제목·설명을 방문자 언어로 (2026-08-31).
//
// ⚠️ 왜 page 가 아니라 layout 인가: app/consultation/[id]/page.jsx 는 첫 줄이 "use client" 다
//    (LiveKit 훅을 쓴다). 클라이언트 컴포넌트는 metadata·generateMetadata 를 내보낼 수 없으므로
//    서버 경계가 필요하고, 그 경계가 여기다. 「page 로 옮기자」로 되돌리면 빌드가 깨진다.
//
// ⚠️ 왜 필요했나 (실측): proxy.ts 의 GUEST_LINK_PREFIXES 는 세 개다 — /claim/·/survey/·/consultation/.
//    2026-08-31 오전에 앞의 둘만 언어화하고 여기를 빠뜨렸다. 러시아어 쿠키로 재 보니
//    <title> 이 "healwith | Korea Cancer Care for International Patients"(영어)로 나왔다.
//    셋 다 코디가 왓츠앱·텔레그램으로 환자에게 붙여 보내는 주소이고, 그중 이 방 링크를 제일 자주
//    보낸다 → 메신저 미리보기 카드가 title+description 을 그대로 읽어 환자에게 영어로 떴다.
//    (문구는 고정값이라 방 번호·환자 정보가 미리보기로 새지 않는다.)
//
// ⚠️ alternates: null 은 지우지 마라 — /claim·/survey 와 같은 이유다. 게스트 분기는 x-locale 은
//    붙이고 x-pathname 은 안 붙여서, 그대로 두면 루트 layout 이 canonical 을 «그 언어 홈»으로
//    잘못 찍는다(noindex 화면에 canonical = 구글이 피하라는 조합).
//
// base 를 인라인 객체가 아니라 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조
// (seoMeta.test.ts 의 정규식이 `localizedMeta(식별자, "키", "키")` 를 문다).
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.consultation.title", "seo.consultation.desc");
}

export default function ConsultationLayout({ children }) {
  return children;
}
