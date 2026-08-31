import ClaimClient from "./ClaimClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 비공개 링크(개인화 토큰) — 검색 색인 금지.
//
// 제목·설명을 방문자 언어로 (2026-08-31). 여기는 «탭 제목»만의 문제가 아니다:
// /claim 은 proxy.ts 의 GUEST_LINK_PREFIXES 라 코디가 왓츠앱·텔레그램·메일로 환자에게
// 붙여 보내는 주소다 → **메신저 미리보기 카드가 title+description 을 그대로 읽는다.**
// 검색엔 안 뜨지만 미리보기는 뜬다. 러/카 환자에게 한국어 카드가 뜨던 자리.
// (문구는 고정값이라 토큰·환자 정보가 미리보기로 새지 않는다.)
//
// ⚠️ alternates: null 은 지우지 마라. 게스트 분기는 x-locale 은 붙이고 x-pathname 은 안 붙여서,
//    그대로 두면 루트 layout 이 canonical 을 «그 언어 홈»으로 잘못 찍는다(noindex 와 동시 선언 =
//    구글이 피하라는 조합). null 이 그 상속을 끊는다.
// ⚠️ 옛 값은 "진행 상황 — healwith" 였는데 루트 template("%s | healwith")이 또 붙어
//    「… — healwith | healwith」로 브랜드가 두 번 떴다. 이제 브랜드는 사전 값 안에 한 번만 있다.
export async function generateMetadata() {
  return localizedMeta(
    { robots: { index: false, follow: false }, alternates: null },
    "seo.claim.title",
    "seo.claim.desc"
  );
}

export default async function ClaimPage({ params }) {
  const { token } = await params;
  return <ClaimClient token={token} />;
}
