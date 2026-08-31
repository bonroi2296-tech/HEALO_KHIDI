import PatientDashboardClient from "./PatientDashboardClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 탭 제목·설명을 방문자 언어로 (2026-08-31).
// ⚠️ 왜 정적 `export const metadata` 가 아니라 generateMetadata 인가:
//    정적 문자열은 언어 폴백을 «전혀» 안 탄다 → 본문은 러시아어인데 탭 제목만 한국어로 떴다.
// ⚠️ 그리고 왜 localizedMeta 가 x-locale 만 보면 안 되는가:
//    /patient 는 proxy.ts 의 PUBLIC_PREFIXES 밖이라 **x-locale 헤더가 안 붙는다.**
//    그래서 localizedMeta 안쪽은 getUiLocale()(x-locale → healo_lang 쿠키 → en)을 쓴다.
//    「x-locale 쓰면 되잖아」로 되돌리면 이 화면은 조용히 영어로 되돌아간다.
// ⚠️ alternates: null 은 지우지 마라 — 루트 layout 이 물려주는 canonical/hreflang 을 «지운다».
//    noindex 화면에 canonical 이 붙는 건 구글이 명시적으로 피하라는 조합이다.
export async function generateMetadata() {
  return localizedMeta(
    { robots: { index: false, follow: false }, alternates: null },
    "seo.patientDash.title",
    "seo.patientDash.desc"
  );
}

export default function PatientPage() {
  return <PatientDashboardClient />;
}
