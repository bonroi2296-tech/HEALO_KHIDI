import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import HospitalSiteClient from "./HospitalSiteClient";
import { IMMUNE_SITE } from "@/lib/tenant/content/immuneSite";
import { LOCALES } from "@/lib/i18n/config";

/**
 * 병원 사이트 「판」 시연 페이지 — B2B 로 병원에 보여줄 화면.
 *
 * 🔒 **healwith 실서비스에는 안 뜬다.** 로컬(dev)에서만 열린다 —
 *    프로덕션에서 열면 우리 사이트에 남의 병원 화면이 색인되고,
 *    아직 병원 확인을 안 받은 정보가 공개된다.
 *    영업용 링크가 필요해지면 그때 별도 주소·별도 배포로 뺀다(기획서 §10-6).
 *
 * 언어: `?lang=ru` 로 바꿔 본다(기본 ko). 판이 6개 언어를 다 그리는지 확인용.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "병원 사이트 템플릿 시연",
  robots: { index: false, follow: false },
};

export default async function HospitalTemplateDemoPage({ searchParams }) {
  // 프로덕션에서는 존재하지 않는 페이지로 취급한다.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEMPLATE_DEMO !== "1") {
    notFound();
  }
  const sp = await searchParams;
  const requested = typeof sp?.lang === "string" ? sp.lang : null;
  const cookieLang = (await cookies()).get("healo_lang")?.value;
  const headerLang = (await headers()).get("x-locale");
  const lang = [requested, headerLang, cookieLang].find((l) => LOCALES.includes(l)) || "ko";

  return <HospitalSiteClient site={IMMUNE_SITE} lang={lang} />;
}
