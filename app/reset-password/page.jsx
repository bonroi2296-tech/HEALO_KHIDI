import ResetPasswordClient from "./ResetPasswordClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 새 비밀번호 설정 — **메일 링크로 들어오는 화면**이다. 즉 환자가 메일함에서 누르고 도착하는데
// 그때 브라우저에 healo_lang 쿠키가 없을 수도 있다 → getUiLocale 이 Accept-Language 까지 못 보는
// 대신 proxy 가 못 붙인 x-locale 을 쿠키로 잇는다. 쿠키도 없으면 en 이다(그건 설계상 마지막 칸).
// ⚠️ 정적 `export const metadata` 로 되돌리지 마라 — 문자열은 언어 폴백을 «전혀» 안 탄다.
//    본문은 방문자 언어로 잘 나오는데(루트 layout 이 healo_lang 쿠키를 본다) 탭 제목·설명만
//    한 언어에 굳는 구조다. 빌드도 200 응답도 정상이라 눈으로는 안 잡힌다.
// ⚠️ base 는 «이름 붙인 상수»여야 한다 — seoMeta.test.ts 의 정규식이 `localizedMeta(식별자, "키", "키")`
//    를 물기 때문에, 인라인 객체로 넘기면 이 화면이 ru/kz 키릴 검사에서 조용히 빠진다.
const baseMeta = { robots: { index: false, follow: false } };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.resetPassword.title", "seo.resetPassword.desc");
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
