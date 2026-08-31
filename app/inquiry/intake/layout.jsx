import { localizedMeta } from "@/lib/i18n/metadata";

// 「추가 정보 입력」 폼(/{lang}/inquiry/intake?inquiryId=&token=)의 제목·설명·색인 정책.
//
// ⚠️ 왜 page 가 아니라 layout 인가: app/inquiry/intake/page.jsx 는 첫 줄이 "use client" 다.
//    클라이언트 컴포넌트는 metadata·generateMetadata 를 못 내보내니 서버 경계가 필요하고,
//    그 경계가 여기다. app/consultation/layout.jsx 와 같은 이유·같은 모양이다.
//
// ⚠️ 이 화면은 «주소만 공개 prefix 안에 있을 뿐» 실제로는 토큰 링크다 (2026-08-31 실측):
//    IntakeClient.jsx:184 가 inquiryId·token 없으면 `return null` — 즉 토큰 없이 열면 «빈 화면»이다.
//    링크를 만드는 곳은 app/api/coordinator/inquiries/[id]/request-info/route.ts:95 이고,
//    코디네이터가 «환자 언어 prefix»로 메일·메신저로 보낸다.
//    → 두 가지가 동시에 틀려 있었다:
//      ① 제목·og 가 루트 layout 의 영어 마케팅 카드였다 — 러시아어 환자에게 메일 미리보기가
//         "healwith | Korea Cancer Care for International Patients" 로 떴다.
//         /claim·/survey·/consultation 을 고치면서 이 네 번째 링크만 빠졌다.
//      ② robots 가 없어 **색인 가능**이었고 canonical(/ru/inquiry/intake)까지 나갔다.
//         토큰 없이 들어오면 빈 화면이므로 구글엔 「내용 없는 페이지」가 색인된다.
//    (문구는 고정값이라 문의번호·토큰·환자 정보가 미리보기로 새지 않는다.)
//
// ⚠️ alternates: null 을 지우지 마라. 여기는 PUBLIC_PREFIXES 안이라 x-locale·x-pathname 이
//    둘 다 붙고, 그러면 루트 layout 이 canonical+hreflang 을 «정상적으로» 내보낸다.
//    노출이 정상이어도 noindex 화면에 canonical 을 같이 선언하는 건 구글이 피하라는 조합이라
//    여기서 끊는다(/claim 과 이유는 같고 경위만 다르다).
//
// base 를 인라인 객체가 아니라 이름 붙인 상수로 두는 이유는 app/patient/page.jsx 주석 참조.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.inquiryIntake.title", "seo.inquiryIntake.desc");
}

export default function InquiryIntakeLayout({ children }) {
  return children;
}
