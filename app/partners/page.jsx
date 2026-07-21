import { Suspense } from "react";
import PartnersClient from "./PartnersClient";
import { getRequestLocale } from "@/lib/i18n/metadata";
import { COPY } from "./copy";

// B2B 랜딩이라 SEO 제목·설명을 i18n index 대신 로컬 카피에서 직접 읽는다(카피 단일 SoR 유지).
export async function generateMetadata() {
  const { locale } = await getRequestLocale();
  const c = COPY[locale] || COPY.en;
  return {
    title: { absolute: c.seoTitle },
    description: c.seoDesc,
    openGraph: { title: c.seoTitle, description: c.seoDesc, type: "website" },
  };
}

export default function PartnersPage() {
  return (
    <Suspense>
      <PartnersClient />
    </Suspense>
  );
}
