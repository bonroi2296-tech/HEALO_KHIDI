import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import HospitalSiteClient from "./HospitalSiteClient";
import { IMMUNE_SITE } from "@/lib/tenant/content/immuneSite";
import { LOCALES } from "@/lib/i18n/config";
import { isTemplateDemoVisible } from "@/lib/tenant/demoGate";

/**
 * 병원 사이트 「판」 시연 페이지 — B2B 로 병원에 보여줄 화면.
 *
 * 🔒 **healwith 실서비스에는 안 뜬다.** 로컬(dev)과 **프리뷰 빌드**에서만 열린다 —
 *    실서비스에서 열면 우리 사이트에 남의 병원 화면이 색인되고,
 *    아직 병원 확인을 안 받은 정보가 공개된다.
 *    누구에게 보일지의 판정은 `src/lib/tenant/demoGate.js` 한 곳에 있다(거기 이유도 적어 뒀다).
 *
 * 언어: `?lang=ru` 로 바꿔 본다(기본 ko). 필수 3개(ko·en·ru) 외 언어는 영어로 떨어진다.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "병원 사이트 템플릿 시연",
  robots: { index: false, follow: false },
};

export default async function HospitalTemplateDemoPage({ searchParams }) {
  // 누구에게 보일지는 `demoGate.js` 한 곳에서 정한다 (실서비스 404 · 프리뷰만 열림).
  if (!isTemplateDemoVisible()) notFound();
  const sp = await searchParams;
  const requested = typeof sp?.lang === "string" ? sp.lang : null;
  const cookieLang = (await cookies()).get("healo_lang")?.value;
  const headerLang = (await headers()).get("x-locale");
  const lang = [requested, headerLang, cookieLang].find((l) => LOCALES.includes(l)) || "ko";

  return <HospitalSiteClient site={IMMUNE_SITE} lang={lang} />;
}
