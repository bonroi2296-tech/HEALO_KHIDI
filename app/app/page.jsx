import AppInstallClient from "./AppInstallClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 앱 설치 안내 — QR·짧은 주소로 «환자 폰»에서 열리는 화면이다. 검색 대상은 아니지만(noindex)
// 사람이 보는 화면이므로 제목·설명이 그 사람 언어여야 한다.
// ⚠️ 정적 `export const metadata` 로 되돌리지 마라 — 문자열은 언어 폴백을 «전혀» 안 탄다.
//    본문은 방문자 언어로 잘 나오는데(루트 layout 이 healo_lang 쿠키를 본다) 탭 제목·설명만
//    한 언어에 굳는 구조다. 빌드도 200 응답도 정상이라 눈으로는 안 잡힌다.
// ⚠️ base 는 «이름 붙인 상수»여야 한다 — seoMeta.test.ts 의 정규식이 `localizedMeta(식별자, "키", "키")`
//    를 물기 때문에, 인라인 객체로 넘기면 이 화면이 ru/kz 키릴 검사에서 조용히 빠진다.
// ⚠️ alternates: null 을 지우지 마라 — 2026-08-31 에 «여기가 없어서» 실제로 사고가 났다.
//    같은 날 proxy.ts 에 VISITOR_LANG_PREFIXES 를 넣어 이 화면들에 x-locale 을 주입하기 시작했는데
//    (쿠키 없는 첫 방문자 언어 문제), 그 순간 루트 layout(app/layout.jsx)이 alternates 를 내보내게 됐다.
//    게다가 이 분기는 x-pathname 을 «안» 붙이므로 canonical 이 자기 주소가 아니라 「그 언어 홈」으로 찍혔다.
//    실측: noindex 인데 <link rel="canonical" href="https://healwith.co.kr/ru"> — 구글에
//    「이 화면이 곧 홈페이지」라고 알리는 잘못된 통합 신호이고, noindex+canonical 은 피하라는 조합이다.
//    → 언어 주입과 색인 신호는 «따로» 다뤄야 한다. 이 한 줄이 그 경계다.
const baseMeta = { robots: { index: false, follow: false }, alternates: null };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.appInstall.title", "seo.appInstall.desc");
}

export default function AppInstallPage() {
  return <AppInstallClient />;
}
