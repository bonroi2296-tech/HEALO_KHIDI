import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import HospitalPageClient from "./HospitalPageClient";
import { IMMUNE_SITE } from "@/lib/tenant/content/immuneSite";
import { IMMUNE_PAGES } from "@/lib/tenant/content/immunePages";
import { LOCALES } from "@/lib/i18n/config";

/**
 * 판의 속 페이지(탭) 시연 — `/demo/hospital/<slug>`.
 * 홈과 같은 이유로 **실서비스에선 404**(우리 사이트에 남의 병원 화면이 색인되면 안 된다).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = IMMUNE_PAGES[slug];
  return {
    title: page ? `${page.title.ko} · 병원 사이트 템플릿 시연` : "병원 사이트 템플릿 시연",
    robots: { index: false, follow: false },
  };
}

export default async function HospitalTemplateSubPage({ params, searchParams }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEMPLATE_DEMO !== "1") {
    notFound();
  }
  const { slug } = await params;
  const page = IMMUNE_PAGES[slug];
  if (!page) notFound();

  const sp = await searchParams;
  const requested = typeof sp?.lang === "string" ? sp.lang : null;
  const cookieLang = (await cookies()).get("healo_lang")?.value;
  const headerLang = (await headers()).get("x-locale");
  const lang = [requested, headerLang, cookieLang].find((l) => LOCALES.includes(l)) || "ko";

  return <HospitalPageClient site={IMMUNE_SITE} page={page} slug={slug} lang={lang} />;
}
