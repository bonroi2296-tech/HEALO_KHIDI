import ConfirmClient from "./ConfirmClient";
import { localizedMeta } from "@/lib/i18n/metadata";

// 계정 확인 — 가입 확인 메일의 링크가 도착하는 화면. reset-password 와 같은 부류다
// (메일 → 브라우저, 쿠키가 없을 수 있음).
// ⚠️ 정적 `export const metadata` 로 되돌리지 마라 — 문자열은 언어 폴백을 «전혀» 안 탄다.
//    본문은 방문자 언어로 잘 나오는데(루트 layout 이 healo_lang 쿠키를 본다) 탭 제목·설명만
//    한 언어에 굳는 구조다. 빌드도 200 응답도 정상이라 눈으로는 안 잡힌다.
// ⚠️ base 는 «이름 붙인 상수»여야 한다 — seoMeta.test.ts 의 정규식이 `localizedMeta(식별자, "키", "키")`
//    를 물기 때문에, 인라인 객체로 넘기면 이 화면이 ru/kz 키릴 검사에서 조용히 빠진다.
const baseMeta = { robots: { index: false, follow: false } };

export async function generateMetadata() {
  return localizedMeta(baseMeta, "seo.authConfirm.title", "seo.authConfirm.desc");
}

export default function ConfirmPage() {
  return <ConfirmClient />;
}
